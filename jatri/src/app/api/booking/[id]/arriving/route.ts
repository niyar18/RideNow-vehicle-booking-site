import { withoutRiderSecrets } from "@/lib/bookingPrivacy";
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { auth } from "@/auth";
import { transitionBookingState } from "@/lib/bookingStateMachine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  const transitionRes = await transitionBookingState({
    bookingId: id,
    targetStatus: "driver_arriving",
    actorId,
    actorRole,
  });

  if (!transitionRes.success) {
    const status = transitionRes.errorCode === "UNAUTHORIZED" ? 403 : 400;
    return NextResponse.json({ message: transitionRes.message || "Could not update arriving status" }, { status });
  }

  return NextResponse.json({ success: true, booking: withoutRiderSecrets(transitionRes.booking) });
}