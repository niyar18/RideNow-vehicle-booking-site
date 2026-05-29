import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await connectDb();

    const booking = await Booking.findById(id);

    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found" },
        { status: 404 }
      );
    }

    booking.status = "completed";
    booking.completedAt = new Date();

    await booking.save();

    return NextResponse.json(
      {
        success: true,
        message: "Ride completed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Complete booking error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}