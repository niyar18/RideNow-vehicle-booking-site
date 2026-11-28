import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { auth } from "@/auth";
import { emitSocketEvent } from "@/lib/socketServerEmit";

async function notifySocket(userId: string, event: string, data: any) {
  try {
    await emitSocketEvent({
      userId,
      event,
      data,
      directBookingId: data?.bookingId?.toString(),
    });
  } catch (err) {
    console.error("Socket emit error in safety checkin route:", err);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectDb();
  const id = (await context.params).id;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const booking = await Booking.findById(id);
  if (!booking) {
    return NextResponse.json({ message: "Booking not found" }, { status: 404 });
  }

  if (booking.user?.toString() !== session.user.id.toString()) {
    return NextResponse.json({ message: "Only the rider can update this safety check-in" }, { status: 403 });
  }

  const body = await req.json();
  const { action, notes, deviationDistanceMeters } = body;

  const now = new Date();

  if (action === "confirm_safe") {
    booking.safetyStatus = "passenger_confirmed_safe";
    booking.lastSafetyCheckInAt = now;
    booking.isRouteDeviated = false;
    booking.safetyNotes = notes || `Confirmed safe by passenger (${now.toLocaleTimeString()})`;
  } else if (action === "trigger_sos") {
    const { triggerEmergencySos } = await import("@/lib/safetyEngine");
    try {
      const result = await triggerEmergencySos({
        bookingId: booking._id,
        reporterId: session.user.id,
        reporterRole: "user",
        reason: notes || "Passenger triggered emergency SOS via safety check-in prompt",
      });
      return NextResponse.json({
        success: true,
        isPanicActive: true,
        incidentRecorded: true,
        incidentId: result.incidentId,
      });
    } catch (error) {
      console.error("Safety check-in SOS recording failed:", error);
      return NextResponse.json(
        { message: "Jaatri could not confirm the SOS was recorded. For immediate help, call 112 directly." },
        { status: 500 }
      );
    }
  } else if (action === "report_deviation") {
    booking.safetyStatus = "deviation_detected";
    booking.isRouteDeviated = true;
    booking.lastSafetyCheckInAt = now;
    booking.safetyNotes = notes || `Route deviation detected (${deviationDistanceMeters || 500}m off route)`;
  } else {
    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  }

  await booking.save();

  // Notify passenger and driver sockets
  const payload = {
    bookingId: booking._id,
    safetyStatus: booking.safetyStatus,
    isPanicActive: booking.isPanicActive,
    isRouteDeviated: booking.isRouteDeviated,
    lastSafetyCheckInAt: booking.lastSafetyCheckInAt,
    safetyNotes: booking.safetyNotes,
  };

  if (booking.user) {
    await notifySocket(booking.user.toString(), "safety-checkin-updated", payload);
  }
  if (booking.driver) {
    await notifySocket(booking.driver.toString(), "safety-checkin-updated", payload);
  }

  return NextResponse.json({
    success: true,
    booking,
    message: action === "confirm_safe" ? "Safety confirmed" : "Safety alert updated",
  });
}
