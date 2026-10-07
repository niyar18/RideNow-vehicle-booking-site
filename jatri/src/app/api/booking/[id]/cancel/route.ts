import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Wallet from "@/models/wallet.model";
import {
  calculateDynamicCancellationFee,
  processRideCancellationSettlement,
} from "@/lib/cancellationEngine";
import { sendPushToUser } from "@/lib/webPush";
import { haversineDistance } from "@/lib/routeUtils";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDb();
  const id = (await context.params).id;

  const session = await auth();
  const sessionUser = session?.user?.email
    ? await User.findOne({ email: session.user.email }).select("_id role").lean()
    : null;

  if (!sessionUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const booking = await Booking.findById(id);
  if (!booking) {
    return NextResponse.json({ message: "Ride booking not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const reason = searchParams.get("reason") || "Cancelled by passenger";
  const cancelledBy = (searchParams.get("cancelledBy") as "user" | "driver" | "admin" | "system") || "user";

  let driverLocation: [number, number] | undefined = undefined;
  if (booking.driver) {
    const driverDoc = await User.findById(booking.driver).select("location").lean();
    if (driverDoc?.location?.coordinates && driverDoc.location.coordinates.length >= 2) {
      driverLocation = [driverDoc.location.coordinates[0], driverDoc.location.coordinates[1]];
    }
  }

  const feeAssessment = calculateDynamicCancellationFee({
    booking,
    cancelledBy,
    reason,
    driverLocation,
  });

  const walletDoc = await Wallet.findOne({ user: booking.user }).lean();
  const currentWalletBalance = walletDoc?.balance || 0;
  const currentOutstanding = walletDoc?.outstandingAmount || 0;

  let willDeductFromWallet = 0;
  let willAddToOutstanding = 0;

  if (feeAssessment.feeApplied && feeAssessment.fee > 0) {
    if (booking.paymentStatus === "paid") {
      willDeductFromWallet = 0;
      willAddToOutstanding = 0;
    } else {
      if (currentWalletBalance >= feeAssessment.fee) {
        willDeductFromWallet = feeAssessment.fee;
      } else {
        willDeductFromWallet = currentWalletBalance;
        willAddToOutstanding = feeAssessment.fee - currentWalletBalance;
      }
    }
  }

  return NextResponse.json({
    success: true,
    fee: feeAssessment.fee,
    feeApplied: feeAssessment.feeApplied,
    reason: feeAssessment.reason,
    driverCompensation: feeAssessment.driverCompensation,
    elapsedSeconds: feeAssessment.elapsedSeconds,
    currentWalletBalance,
    currentOutstanding,
    willDeductFromWallet,
    willAddToOutstanding,
    isPrepaid: booking.paymentStatus === "paid",
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDb();
  const id = (await context.params).id;

  const session = await auth();
  const sessionUser = session?.user?.email
    ? await User.findOne({ email: session.user.email }).select("_id role").lean()
    : null;

  const body = await req.json().catch(() => ({}));
  const reason = (body.reason as string) || "Ride cancelled by passenger";
  const cancelledBy = (body.cancelledBy as "user" | "driver" | "admin" | "system") || "user";

  const booking = await Booking.findById(id);

  if (!booking) {
    return NextResponse.json({ message: "Ride booking not found" }, { status: 404 });
  }

  // Cross-tenant authorization check (unless triggered by internal system dispatch)
  if (cancelledBy !== "system") {
    if (!sessionUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = sessionUser._id.toString();
    const riderId = booking.user?.toString();
    const driverId = booking.driver?.toString();
    const isAdmin = sessionUser.role === "admin";

    const isAuthorized =
      isAdmin ||
      (cancelledBy === "user" && riderId === currentUserId) ||
      (cancelledBy === "driver" && driverId === currentUserId);

    if (!isAuthorized) {
      return NextResponse.json(
        { message: "Forbidden: You are not authorized to cancel this ride" },
        { status: 403 }
      );
    }
  }

  if (["completed", "cancelled", "rejected", "expired"].includes(booking.status)) {
    return NextResponse.json(
      { message: `Booking is already ${booking.status}` },
      { status: 400 }
    );
  }

  // 1️⃣ Calculate elapsed time from driver acceptance
  const isDriverAssigned =
    booking.status === "confirmed" ||
    booking.status === "awaiting_payment" ||
    Boolean(booking.acceptedAt);

  const acceptedTime = booking.acceptedAt
    ? new Date(booking.acceptedAt).getTime()
    : booking.status === "confirmed"
    ? new Date(booking.updatedAt).getTime()
    : null;

  // 1️⃣ Dynamic Cancellation Assessment via authoritative cancellationEngine
  let driverLocation: [number, number] | undefined = undefined;
  if (booking.driver) {
    const driverDoc = await User.findById(booking.driver).select("location").lean();
    if (driverDoc?.location?.coordinates && driverDoc.location.coordinates.length >= 2) {
      driverLocation = [driverDoc.location.coordinates[0], driverDoc.location.coordinates[1]];
    }
  }

  const {
    fee: cancellationFee,
    feeApplied: cancellationFeeApplied,
    reason: penaltyReason,
    elapsedSeconds,
    driverCompensation,
  } = calculateDynamicCancellationFee({
    booking,
    cancelledBy,
    reason,
    driverLocation,
  });

  // 2️⃣ Full Financial Ledger Settlement: Customer Wallet / Outstanding balance & Driver compensation
  const isPrepaid = booking.paymentStatus === "paid";
  const paidAmount = isPrepaid ? booking.fare || 0 : 0;

  let refundAmount = 0;
  let walletDeducted = 0;
  let outstandingAccrued = 0;
  let driverCompCredited = 0;

  try {
    const settlement = await processRideCancellationSettlement({
      bookingId: booking._id,
      riderId: booking.user,
      driverId: booking.driver,
      cancellationFee,
      cancellationFeeApplied,
      reason,
      isPrepaid,
      paidAmount,
      driverCompensation,
    });

    refundAmount = settlement.refundAmount;
    walletDeducted = settlement.walletDeducted;
    outstandingAccrued = settlement.outstandingAccrued;
    driverCompCredited = settlement.driverCompCredited;

    if (isPrepaid) {
      booking.paymentStatus = "refunded";
    }
  } catch (settleErr) {
    console.error("Cancellation ledger settlement error:", settleErr);
  }

  // 3️⃣ Update booking status & cancellation metadata
  booking.status = "cancelled";
  booking.cancelledBy = cancelledBy;
  booking.cancellationReason = reason;
  booking.cancellationFee = cancellationFee;
  booking.cancellationFeeApplied = cancellationFeeApplied;
  booking.cancelledAt = new Date();

  await booking.save();

  // 4️⃣ Emit real-time Socket events
  try {
    const payload = {
      bookingId: booking._id.toString(),
      status: "cancelled",
      cancelledBy,
      cancellationReason: reason,
      cancellationFee,
      cancellationFeeApplied,
      refundAmount,
      elapsedSeconds,
    };

    // Emit to driver socket
    if (booking.driver) {
      await fetch(`${process.env.NEXT_PUBLIC_SOCKET_SERVER}/emit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: booking.driver.toString(),
          event: "booking-updated",
          data: payload,
        }),
      });
    }

    // Emit to passenger socket
    await fetch(`${process.env.NEXT_PUBLIC_SOCKET_SERVER}/emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: booking.user.toString(),
        event: "booking-updated",
        data: payload,
      }),
    });
  } catch (err) {
    console.error("Socket cancel emit failed:", err);
  }

  // 5️⃣ Send Web Push alerts
  try {
    if (cancelledBy === "user" && booking.driver) {
      // Notify driver that user cancelled
      await sendPushToUser(booking.driver.toString(), {
        title: "Ride Cancelled by Rider ❌",
        body: cancellationFeeApplied
          ? `Ride #${booking._id.toString().slice(-6)} was cancelled. ₹${driverCompCredited || driverCompensation} cancellation compensation credited to your earnings.`
          : `Ride #${booking._id.toString().slice(-6)} was cancelled by the passenger.`,
        url: "/partner",
        tag: `booking-cancelled-${booking._id.toString()}`,
      });
    } else if (cancelledBy === "driver") {
      // Notify passenger that driver cancelled
      await sendPushToUser(booking.user.toString(), {
        title: "Ride Cancelled by Driver ⚠️",
        body: `Your driver cancelled ride #${booking._id.toString().slice(-6)}. Reason: ${reason}. Tap to book another ride.`,
        url: `/ride/${booking._id.toString()}`,
        tag: `booking-cancelled-${booking._id.toString()}`,
      });
    }
  } catch (pushErr) {
    console.error("Web Push on cancellation failed:", pushErr);
  }

  return NextResponse.json({
    success: true,
    cancellationFee,
    cancellationFeeApplied,
    refundAmount,
    walletDeducted,
    outstandingAccrued,
    driverCompCredited,
    elapsedSeconds,
    penaltyReason,
    reason,
  });
}