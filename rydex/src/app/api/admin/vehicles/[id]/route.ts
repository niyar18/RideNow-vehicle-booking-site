import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Vehicle from "@/models/vehicle.model";

/* ================================
   GET → Single Vehicle Review
================================ */

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDb();

    const vehicleId = (await context.params).id;

    const vehicle = await Vehicle.findById(vehicleId)
      .populate({
        path: "owner",
        select: "name email vendorOnboardingStep",
      })
      .lean();

    if (!vehicle) {
      return NextResponse.json(
        { message: "Vehicle not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle: {
        _id: vehicle._id,
        type: vehicle.type,
        number: vehicle.number,
        model: vehicle.vehicleModel,
        imageUrl: vehicle.imageUrl,
        baseFare: vehicle.baseFare,
        pricePerKm: vehicle.pricePerKm,
        waitingCharge: vehicle.waitingCharge,
        status: vehicle.status,
        rejectionReason: vehicle.rejectionReason,
        owner: vehicle.owner,
      },
    });
  } catch (error) {
    console.error("VEHICLE REVIEW ERROR:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
