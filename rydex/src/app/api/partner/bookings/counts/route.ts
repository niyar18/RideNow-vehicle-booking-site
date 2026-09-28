import { NextResponse } from "next/server";



import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";

export async function GET() {
  try {
    await connectDb();

    /* ===== SESSION CHECK ===== */
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "vendor") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const vendorId = session.user.id;

    /* ===== COUNTS ===== */

    // Pending = ride request not accepted yet
    const pending = await Booking.countDocuments({
      driver: vendorId,
      status: "requested",
    });

    // Active = accepted or started rides
    const active = await Booking.countDocuments({
      driver: vendorId,
      status: { $in: ["accepted", "started"] },
    });

    return NextResponse.json({
      pending,
      active,
    });

  } catch (error) {
    console.error("Booking Count Error:", error);

    return NextResponse.json(
      { message: "Server Error" },
      { status: 500 }
    );
  }
}