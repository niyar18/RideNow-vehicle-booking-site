import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Booking from "@/models/booking.model";
import { transitionBookingState } from "@/lib/bookingStateMachine";

export async function POST(req: Request) {

  await connectDB();

  try {

    const { bookingId, otp } = await req.json();

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found" },
        { status: 404 }
      );
    }

    if (!booking.pickupOtp) {
      return NextResponse.json(
        { message: "OTP not generated yet. Please tap 'I've Arrived at Pickup'." },
        { status: 400 }
      );
    }

    // Rate Limiting: Lockout check
    if (booking.pickupOtpLockedUntil && new Date(booking.pickupOtpLockedUntil) > new Date()) {
      const waitSeconds = Math.ceil(
        (new Date(booking.pickupOtpLockedUntil).getTime() - Date.now()) / 1000
      );
      return NextResponse.json(
        {
          message: `Too many failed attempts. Verification is locked. Please try again in ${waitSeconds} seconds.`,
          isLocked: true,
          lockedSeconds: waitSeconds,
        },
        { status: 429 }
      );
    }

    if (String(booking.pickupOtp).trim() !== String(otp).trim()) {
      const failed = (booking.pickupOtpFailedAttempts || 0) + 1;
      if (failed >= 5) {
        booking.pickupOtpLockedUntil = new Date(Date.now() + 5 * 60 * 1000);
        booking.pickupOtpFailedAttempts = 0;
        await booking.save();
        return NextResponse.json(
          {
            message: "Too many failed attempts. OTP verification is locked for 5 minutes for safety.",
            isLocked: true,
            lockedSeconds: 300,
          },
          { status: 429 }
        );
      } else {
        booking.pickupOtpFailedAttempts = failed;
        await booking.save();
        const remaining = 5 - failed;
        return NextResponse.json(
          {
            message: `Invalid OTP. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining before 5-minute lockout.`,
            remainingAttempts: remaining,
          },
          { status: 400 }
        );
      }
    }

    if (booking.pickupOtpExpires && new Date(booking.pickupOtpExpires) < new Date()) {
      return NextResponse.json(
        { message: "OTP expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Reset failed attempts on success
    booking.pickupOtpFailedAttempts = 0;
    booking.pickupOtpLockedUntil = null;

    /* update status via canonical State Machine */

    const now = new Date();
    const duration = booking.tripDurationMinutes || (booking.fareBreakdown?.timeMinutes ? Math.round(booking.fareBreakdown.timeMinutes) : 15);
    const estimatedDropoffTime = new Date(now.getTime() + duration * 60 * 1000);

    // Generate fresh, distinct Drop-off OTP for destination completion
    let newDropOtp = Math.floor(1000 + Math.random() * 9000).toString();
    while (newDropOtp === String(otp).trim()) {
      newDropOtp = Math.floor(1000 + Math.random() * 9000).toString();
    }

    const transitionRes = await transitionBookingState({
      bookingId: booking._id,
      targetStatus: "started",
      actorRole: "driver",
      payload: {
        startedAt: now,
        estimatedDropoffTime,
        tripDurationMinutes: duration,
        pickupOtp: "",
        pickupOtpExpires: null,
        dropOtp: newDropOtp,
        dropOtpExpires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    if (!transitionRes.success) {
      return NextResponse.json(
        { message: transitionRes.message || "Failed to start ride" },
        { status: 400 }
      );
    }

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
            status: "started",
            startedAt: now,
            estimatedDropoffTime,
            tripDurationMinutes: duration,
            pickupOtp: "",
            dropOtp: newDropOtp,
          },
        }),
      });
    } catch (err) {
      console.error("Socket notification for verified pickup OTP failed:", err);
    }

    // Trigger Web Push to passenger
    try {
      const { sendPushToUser } = await import("@/lib/webPush");
      const dropTimeStr = booking.estimatedDropoffTime
        ? new Date(booking.estimatedDropoffTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "shortly";
      await sendPushToUser(booking.user.toString(), {
        title: "Trip Started 🛣️",
        body: `Heading to ${booking.dropAddress}. Est. drop-off by ${dropTimeStr}.`,
        url: `/ride/${booking._id}`,
      });
    } catch (pushErr) {
      console.warn("Push notification error on ride start:", pushErr);
    }

    return NextResponse.json({
      success: true,
      message: "OTP verified. Ride started."
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      { message: "OTP verification failed" },
      { status: 500 }
    );

  }

}