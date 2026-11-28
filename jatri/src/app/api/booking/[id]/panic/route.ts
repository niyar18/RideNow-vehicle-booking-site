import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import { triggerEmergencySos } from "@/lib/safetyEngine";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const session = await auth();
    const id = (await context.params).id;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized: Sign in required to trigger emergency SOS" },
        { status: 401 }
      );
    }

    const Booking = (await import("@/models/booking.model")).default;
    const booking = await Booking.findById(id).select("user driver status").lean();
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const currentUserId = session.user.id.toString();
    const isPassenger = booking.user?.toString() === currentUserId;
    const isDriver = booking.driver?.toString() === currentUserId;
    const isAdmin = session.user.role === "admin";

    if (!isPassenger && !isDriver && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: You are not a party to this booking" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = body.reason || "Emergency SOS Panic button pressed";
    const coordinates = Array.isArray(body.coordinates) ? body.coordinates : undefined;

    const reporterRole =
      session?.user?.role === "vendor" || session?.user?.role === "driver"
        ? "driver"
        : session?.user?.role === "admin"
        ? "admin"
        : "user";

    const result = await triggerEmergencySos({
      bookingId: id,
      reporterId: session?.user?.id || id,
      reporterRole,
      coordinates,
      reason,
    });

    return NextResponse.json({
      success: true,
      isPanicActive: true,
      incidentId: result.incidentId,
      shareUrl: result.shareUrl,
      incidentRecorded: true,
    });
  } catch (error) {
    console.error("POST /api/booking/[id]/panic error:", error);
    return NextResponse.json(
      { error: "Jaatri could not confirm the SOS was recorded. For immediate help, call 112 directly." },
      { status: 500 }
    );
  }
}
