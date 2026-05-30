import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import { auth } from "@/auth";

import Booking from "@/models/booking.model";


export async function GET() {
  try {
    // 1️⃣ Connect DB
    await connectDb();

    // 2️⃣ Auth Check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 3️⃣ Fetch Data
    const bookings = await Booking.find({
      user: session.user.id,
    })
      .populate({
        path: "vehicle",
        select: "vehicleModel imageUrl type",
      })
      .populate({
        path: "driver",
        select: "name",
      })
      .sort({ createdAt: -1 })
      .lean(); // ⚡ performance boost

    // 4️⃣ Empty Check (Optional)
    if (!bookings || bookings.length === 0) {
      return NextResponse.json(
        { success: true, bookings: [], message: "No bookings found" },
        { status: 200 }
      );
    }

    // 5️⃣ Success Response
    return NextResponse.json(
      { success: true, bookings },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("USER BOOKINGS API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
        error: error.message,
      },
      { status: 500 }
    );
  }
}