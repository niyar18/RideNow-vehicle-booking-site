export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import type { Connection, Types } from "mongoose";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import Wallet from "@/models/wallet.model";
import User from "@/models/user.model";
import WalletTransaction from "@/models/wallet-transaction.model";
import { transitionBookingState } from "@/lib/bookingStateMachine";
import { emitSocketEvent } from "@/lib/socketServerEmit";
import { sendPushToUser } from "@/lib/webPush";
import logger from "@/lib/logger";
import { auth } from "@/auth";
import { generateTransactionId } from "@/lib/walletLedger";
import { releaseStudentDiscountReservation } from "@/lib/studentDiscountEngine";

/**
 * Validates whether the incoming cron request is authorized via:
 * 1. Admin user session (NextAuth)
 * 2. Vercel Cron Bearer secret matching CRON_SECRET env variable
 * 3. Local dev bypass if CRON_SECRET is unset
 */
function isAuthorizedCron(req: Request, isAdmin: boolean): boolean {
  if (isAdmin) return true;

  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Allow non-production development testing if CRON_SECRET is not yet configured
  if (process.env.NODE_ENV !== "production" && !cronSecret) {
    return true;
  }

  return false;
}

// Claim the state change and record any refund in the same transaction.
async function expireStaleBooking(
  connection: Connection, bookingId: Types.ObjectId, now: Date, staleHorizon: Date,
) {
  return connection.transaction(async (session) => {
    const booking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        status: { $in: ["requested", "searching_driver"] },
        isScheduled: { $ne: true },
        createdAt: { $lte: staleHorizon },
      },
      { $set: {
        status: "expired",
        expiredAt: now,
        expiredReason: "No drivers accepted the request within the 15-minute fulfillment window.",
      } },
      { new: true, session },
    );
    if (!booking || booking.paymentStatus !== "paid" || !booking.user || booking.fare <= 0) {
      return booking;
    }

    const rider = await User.findById(booking.user).session(session).select("walletBalance");
    if (!rider) throw new Error("Rider account missing for refund.");
    const existingWallet = await Wallet.findOne({ userId: booking.user }).session(session);
    const previousBalance = existingWallet?.balance ?? rider.walletBalance ?? 0;
    const wallet = existingWallet ?? new Wallet({ userId: booking.user, balance: previousBalance });
    wallet.balance = previousBalance + booking.fare;
    await wallet.save({ session });
    rider.walletBalance = wallet.balance;
    await rider.save({ session, validateModifiedOnly: true });

    await WalletTransaction.create([{
      transactionId: generateTransactionId("TXN_REF_EXP"),
      idempotencyKey: `RIDE_EXPIRY_REFUND_${booking._id}`,
      walletId: wallet._id,
      userId: booking.user,
      rideId: booking._id,
      bookingId: booking._id,
      type: "credit",
      transactionType: "REFUND",
      category: "ride_refund",
      amount: booking.fare,
      balanceBefore: previousBalance,
      balanceAfter: wallet.balance,
      description: "Refund for an unfulfilled expired ride",
      status: "success",
    }], { session });

    booking.paymentStatus = "refunded";
    await booking.save({ session });
    return booking;
  });
}

/**
 * Core Rides Cron Runner:
 * 1. Dispatches scheduled rides within 25-minute pickup window
 * 2. Sweeps and expires stale unfulfilled requests (> 15 minutes) with automatic refunds
 */
export async function executeRidesCron(req: Request) {
  try {
    const session = await auth();
    const isAdmin = session?.user?.role === "admin";

    if (!isAuthorizedCron(req, isAdmin)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized cron execution" },
        { status: 401 }
      );
    }

    const connection = await connectDb();
    if (!connection) throw new Error("Database is not available.");

    const now = new Date();
    let failureCount = 0;
    const dispatchedIds: string[] = [];
    const expiredIds: string[] = [];

    // ── 1️⃣ Scheduled Rides Dispatch (<= 25 mins ahead) ────────────────────
    const dispatchHorizon = new Date(now.getTime() + 25 * 60 * 1000);
    const upcomingBookings = await Booking.find({
      status: "scheduled",
      isScheduled: true,
      scheduledPickupTime: { $lte: dispatchHorizon },
    }).populate("driver");

    for (const booking of upcomingBookings) {
      try {
        const transitionRes = await transitionBookingState({
          bookingId: booking._id,
          targetStatus: "requested",
          actorRole: "system",
          payload: {
            dispatchedAt: now,
          },
        });

        if (!transitionRes.success) {
          if (transitionRes.errorCode !== "RACE_CONDITION" && transitionRes.errorCode !== "TERMINAL_STATE") failureCount += 1;
          logger.warn("cron.scheduled_dispatch_transition_failed", {
            bookingId: String(booking._id),
            error: transitionRes.message,
          });
          continue;
        }

        dispatchedIds.push(booking._id.toString());

        // Notify assigned driver or broadcast to candidate drivers
        if (booking.driver?._id) {
          try {
            await emitSocketEvent({
              userId: booking.driver._id.toString(),
              event: "new-booking",
              data: transitionRes.booking || booking,
              directBookingId: booking._id.toString(),
            });
          } catch (sockErr: any) {
            logger.warn("cron.scheduled_driver_socket_failed", {
              bookingId: String(booking._id),
              error: sockErr?.message,
            });
          }
        } else if (Array.isArray(booking.candidateDrivers) && booking.candidateDrivers.length > 0) {
          for (const candidateId of booking.candidateDrivers) {
            try {
              await emitSocketEvent({
                userId: candidateId.toString(),
                event: "new-booking",
                data: transitionRes.booking || booking,
                directBookingId: booking._id.toString(),
              });
              await sendPushToUser(candidateId.toString(), {
                title: "Scheduled Ride Request Ready! 🚨",
                body: `Pickup in 25 mins: ${booking.pickupAddress?.slice(0, 32) || "Ride request"} • ₹${booking.fare}`,
                url: "/partner",
                tag: `booking-new-${booking._id.toString()}`,
              });
            } catch {
              // Best-effort push notification
            }
          }
        }

        // Notify passenger
        if (booking.user) {
          try {
            await emitSocketEvent({
              userId: booking.user.toString(),
              event: "booking-updated",
              data: {
                bookingId: booking._id.toString(),
                status: "requested",
                message: "Your scheduled ride is now searching for nearby drivers.",
              },
              directBookingId: booking._id.toString(),
            });
          } catch (sockErr: any) {
            logger.warn("cron.scheduled_passenger_socket_failed", {
              bookingId: String(booking._id),
              error: sockErr?.message,
            });
          }
        }

        logger.info("cron.scheduled_ride_dispatched", {
          bookingId: String(booking._id),
          scheduledPickupTime: booking.scheduledPickupTime,
        });
      } catch (dispatchErr: any) {
        failureCount += 1;
        logger.error("cron.scheduled_dispatch_error", {
          bookingId: String(booking._id),
          error: dispatchErr?.message || String(dispatchErr),
        });
      }
    }

    // ── 2️⃣ Stale Unfulfilled Request Sweeper (> 15 mins) ─────────────────
    const staleHorizon = new Date(now.getTime() - 15 * 60 * 1000);
    const staleBookings = await Booking.find({
      status: { $in: ["requested", "searching_driver"] },
      isScheduled: { $ne: true },
      createdAt: { $lte: staleHorizon },
    });

    for (const staleBooking of staleBookings) {
      try {
        const booking = await expireStaleBooking(connection, staleBooking._id, now, staleHorizon);
        if (!booking) continue; // Already handled or no longer eligible.
        expiredIds.push(booking._id.toString());
        try {
          await releaseStudentDiscountReservation(booking._id, booking.user);
        } catch (error) {
          failureCount += 1;
          logger.warn("cron.stale_discount_release_failed", { bookingId: String(booking._id), error });
        }

        // Notify passenger
        if (booking.user) {
          try {
            await emitSocketEvent({
              userId: booking.user.toString(),
              event: "booking-updated",
              data: {
                bookingId: booking._id.toString(),
                status: "expired",
                message: "No drivers were available in your area. Your ride request has expired.",
              },
              directBookingId: booking._id.toString(),
            });
            await sendPushToUser(booking.user.toString(), {
              title: "Ride Request Expired ⏱️",
              body: "No drivers were available in your area. Any prepaid fare has been refunded to your wallet.",
              url: `/ride/${booking._id.toString()}`,
              tag: `booking-expired-${booking._id.toString()}`,
            });
          } catch {
            // Best-effort notification
          }
        }

        logger.info("cron.stale_ride_expired", {
          bookingId: String(booking._id),
          createdAt: booking.createdAt,
        });
      } catch (expireErr: any) {
        failureCount += 1;
        logger.error("cron.stale_expire_error", {
          bookingId: String(staleBooking._id),
          error: expireErr?.message || String(expireErr),
        });
      }
    }

    // ── 3️⃣ Expire Elapsed Student Verification Passes ─────────────────────
    let expiredStudentsCount = 0;
    try {
      const studentCleanupRes = await User.updateMany(
        {
          isStudent: true,
          "studentVerification.expiresAt": { $lt: now },
        },
        {
          $set: {
            isStudent: false,
            "studentVerification.status": "expired",
          },
        }
      );
      expiredStudentsCount = studentCleanupRes.modifiedCount || 0;
      if (expiredStudentsCount > 0) {
        logger.info("cron.expired_students_cleanup", { count: expiredStudentsCount });
      }
    } catch (stuErr: any) {
      failureCount += 1;
      logger.warn("cron.expired_students_cleanup_failed", { error: stuErr?.message || String(stuErr) });
    }

    return NextResponse.json({
      success: failureCount === 0,
      failureCount,
      timestamp: now.toISOString(),
      scheduledDispatchedCount: dispatchedIds.length,
      staleExpiredCount: expiredIds.length,
      expiredStudentsCount,
      dispatchedBookingIds: dispatchedIds,
      expiredBookingIds: expiredIds,
    }, { status: failureCount ? 500 : 200 });
  } catch (error: any) {
    logger.critical("cron.rides_execution_error", {
      error: error?.message || String(error),
      stack: error?.stack,
    });
    return NextResponse.json(
      { success: false, message: "Rides cron execution failed" },
      { status: 500 }
    );
  }
}

// Vercel Cron sends GET requests by default
export async function GET(req: Request) {
  return executeRidesCron(req);
}

// POST support for manual admin trigger or external webhook scheduler
export async function POST(req: Request) {
  return executeRidesCron(req);
}
