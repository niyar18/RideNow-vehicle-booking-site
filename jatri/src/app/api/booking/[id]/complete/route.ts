import { withoutRiderSecrets } from "@/lib/bookingPrivacy";
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { auth } from "@/auth";
import { transitionBookingState } from "@/lib/bookingStateMachine";
import { settleCompletedRidePayment } from "@/lib/settlePayment";
import { rateLimiter } from "@/lib/rateLimit";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  await connectDb();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized: Driver login required" }, { status: 401 });
  }

  const userRole = session.user.role;
  if (userRole !== "vendor" && userRole !== "driver" && userRole !== "admin") {
    return NextResponse.json({ message: "Forbidden: Driver or Admin privileges required" }, { status: 403 });
  }

  const actorRole = userRole === "admin" ? "admin" : "driver";
  const actorId = session.user.id;

  const completeLimit = rateLimiter.check(`booking:complete:${actorId}`, 8, 60 * 1000);
  if (!completeLimit.allowed) {
    return NextResponse.json(
      { message: "Too many completion attempts. Please wait a moment." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { otp, emergencyFallback, bypassReason } = body;

  const Booking = (await import("@/models/booking.model")).default;
  const existingBooking = await Booking.findById(id);
  if (!existingBooking) {
    return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  }

  // Driver Assignment Check
  if (actorRole === "driver" && existingBooking.driver?.toString() !== actorId) {
    return NextResponse.json({ message: "Forbidden: You are not assigned to this booking" }, { status: 403 });
  }

  // Security Gate: Enforce Drop OTP for drivers; restrict emergency bypass strictly to admin
  let dropBypassed = false;
  if (actorRole !== "admin") {
    if (emergencyFallback === true) {
      return NextResponse.json(
        { message: "Emergency OTP bypass requires administrator authorization. Please contact support." },
        { status: 403 }
      );
    }

    if (!otp) {
      return NextResponse.json(
        { message: "Drop-off OTP is required to complete the ride." },
        { status: 400 }
      );
    }
    if (String(existingBooking.dropOtp).trim() !== String(otp).trim()) {
      return NextResponse.json(
        { message: "Invalid Drop-off OTP. Please verify the 4-digit PIN on the customer's screen." },
        { status: 400 }
      );
    }
  } else if (emergencyFallback === true) {
    dropBypassed = true;
  }

  const now = new Date();

  const transitionRes = await transitionBookingState({
    bookingId: id,
    targetStatus: "completed",
    actorId,
    actorRole,
    payload: {
      completedAt: now,
      actualDropoffTime: now,
      dropOtpBypassed: dropBypassed,
      dropOtpBypassReason: dropBypassed ? String(bypassReason).trim() : undefined,
    },
  });

  if (!transitionRes.success) {
    const status = transitionRes.errorCode === "UNAUTHORIZED" ? 403 : 400;
    return NextResponse.json({ message: transitionRes.message || "Could not complete ride" }, { status });
  }

  const booking = transitionRes.booking!;

  // If this was an active transition (not a duplicate call), calculate duration & settle earnings
  if (!transitionRes.isDuplicateCall) {
    if (booking.startedAt) {
      const durationMins = Math.max(
        1,
        Math.round((now.getTime() - new Date(booking.startedAt).getTime()) / (1000 * 60))
      );
      booking.tripDurationMinutes = durationMins;
      await booking.save();
    }

    /* Settle commission and driver wallet earnings */
    const settlementResult = await settleCompletedRidePayment(booking._id);
    if (!settlementResult.success && settlementResult.settlementStatus === "failed") {
      console.error(`[complete] Settlement flagged as pending/failed for booking ${booking._id}:`, settlementResult.error);
      return NextResponse.json({
        success: true,
        booking: withoutRiderSecrets(booking),
        isDuplicate: transitionRes.isDuplicateCall,
        settlementPending: true,
        warning: "Ride completed successfully. Earnings settlement is queued and will update shortly.",
      });
    }
  }

  return NextResponse.json({ success: true, booking: withoutRiderSecrets(booking), isDuplicate: transitionRes.isDuplicateCall });
}