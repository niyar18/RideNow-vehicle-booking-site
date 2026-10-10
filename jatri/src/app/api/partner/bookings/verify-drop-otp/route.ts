import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Booking from "@/models/booking.model";
import { settleCompletedRidePayment } from "@/lib/settlePayment";
import { sendPushToUser } from "@/lib/webPush";

export async function POST(req: Request) {

  await connectDB();

  try {

    const { bookingId, otp, emergencyFallback, bypassReason } = await req.json();

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.status !== "started") {
      return NextResponse.json(
        { message: "Cannot verify drop-off OTP: Ride must be in 'started' status to complete." },
        { status: 400 }
      );
    }

    // Emergency Deadlock Fallback: Passenger phone dead / unreachable at destination
    let isBypassed = false;
    if (emergencyFallback === true) {
      if (!bypassReason || String(bypassReason).trim().length < 5) {
        return NextResponse.json(
          { message: "Please provide a valid reason for emergency completion (e.g., passenger phone dead at destination)." },
          { status: 400 }
        );
      }
      isBypassed = true;
      booking.dropOtpBypassed = true;
      booking.dropOtpBypassReason = String(bypassReason).trim();
    } else {
      // Standard Drop OTP Verification
      if (!booking.dropOtp) {
        return NextResponse.json(
          { message: "Drop OTP not generated yet. Please ask passenger to refresh screen." },
          { status: 400 }
        );
      }

      // Lockout check
      if (booking.dropOtpLockedUntil && new Date(booking.dropOtpLockedUntil) > new Date()) {
        const waitSeconds = Math.ceil(
          (new Date(booking.dropOtpLockedUntil).getTime() - Date.now()) / 1000
        );
        return NextResponse.json(
          {
            message: `Too many failed attempts. Verification is locked. Please try again in ${waitSeconds} seconds or use Emergency Fallback.`,
            isLocked: true,
            lockedSeconds: waitSeconds,
          },
          { status: 429 }
        );
      }

      if (String(booking.dropOtp).trim() !== String(otp).trim()) {
        const failed = (booking.dropOtpFailedAttempts || 0) + 1;
        if (failed >= 5) {
          booking.dropOtpLockedUntil = new Date(Date.now() + 5 * 60 * 1000);
          booking.dropOtpFailedAttempts = 0;
          await booking.save();
          return NextResponse.json(
            {
              message: "Too many failed attempts. Drop OTP verification locked for 5 minutes.",
              isLocked: true,
              lockedSeconds: 300,
            },
            { status: 429 }
          );
        } else {
          booking.dropOtpFailedAttempts = failed;
          await booking.save();
          const remaining = 5 - failed;
          return NextResponse.json(
            {
              message: `Invalid Drop OTP. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining before 5-minute lockout.`,
              remainingAttempts: remaining,
            },
            { status: 400 }
          );
        }
      }

      if (
        (booking.dropOtpExpires || (booking as any).dropExpires) &&
        new Date(booking.dropOtpExpires || (booking as any).dropExpires) < new Date()
      ) {
        return NextResponse.json(
          { message: "Drop OTP expired. Please request a new code or use Emergency Fallback." },
          { status: 400 }
        );
      }

      booking.dropOtpFailedAttempts = 0;
      booking.dropOtpLockedUntil = null;
    }

    /* update status */

    const now = new Date();
    booking.status = "completed";
    booking.completedAt = now;
    booking.actualDropoffTime = now;
    if (booking.startedAt) {
      booking.tripDurationMinutes = Math.max(
        1,
        Math.round((now.getTime() - new Date(booking.startedAt).getTime()) / (1000 * 60))
      );
    }

    booking.dropOtp = "";
    booking.dropOtpExpires = undefined as any;

    await booking.save();

    /* Settle commission and driver wallet earnings */
    await settleCompletedRidePayment(booking._id);

    /* Notify passenger via socket */
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SOCKET_SERVER}/emit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: booking.user.toString(),
          event: "booking-updated",
          data: {
            bookingId: booking._id.toString(),
            status: "completed",
            completedAt: booking.completedAt,
            actualDropoffTime: booking.actualDropoffTime,
            tripDurationMinutes: booking.tripDurationMinutes,
            dropOtp: "",
          },
        }),
      });
    } catch (err) {
      console.error("Socket notification for verified drop OTP failed:", err);
    }

    /* Send Web Push notification to passenger */
    try {
      await sendPushToUser(booking.user.toString(), {
        title: "Trip Completed! 🎉",
        body: `You've arrived at your destination. Total: ₹${booking.fare}. Thanks for riding with Jatri!`,
        url: `/ride/${booking._id.toString()}`,
        tag: `booking-${booking._id.toString()}`,
      });
    } catch (pushErr) {
      console.error("Push notification for trip completion failed:", pushErr);
    }

    return NextResponse.json({
      success: true,
      message: "OTP verified. Ride completed."
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      { message: "OTP verification failed" },
      { status: 500 }
    );

  }

}