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

    if (String(booking.pickupOtp).trim() !== String(otp).trim()) {
      return NextResponse.json(
        { message: "Invalid OTP. Please check the 4-digit code on the customer's screen." },
        { status: 400 }
      );
    }

    if (booking.pickupOtpExpires && new Date(booking.pickupOtpExpires) < new Date()) {
      return NextResponse.json(
        { message: "OTP expired. Please request a new code." },
        { status: 400 }
      );
    }

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