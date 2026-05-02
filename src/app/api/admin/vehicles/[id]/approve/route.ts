import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Vehicle from "@/models/vehicle.model";
import User from "@/models/user.model";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const vehicleId = (await context.params).id;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return NextResponse.json({ message: "Vehicle not found" }, { status: 404 });
    }

    vehicle.status = "approved";
    vehicle.rejectionReason = undefined;
    await vehicle.save();

    // 🔥 Move vendor to LIVE step (7)
    await User.findByIdAndUpdate(vehicle.owner, {
      vendorOnboardingStep: 7,
    });

    return NextResponse.json({
      message: "Vehicle pricing approved",
    });
  } catch (error) {
    console.error("VEHICLE APPROVE ERROR:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
