import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";


export async function GET() {
  try {

    const session = await auth();

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDb();

    /* last 7 days date */
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const bookings = await Booking.find({
      paymentStatus: "paid",
      createdAt: { $gte: sevenDaysAgo }
    }).select("adminCommission createdAt");

    const earningsMap: Record<string, number> = {};

    bookings.forEach((b) => {

      const date = new Date(b.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      });

      if (!earningsMap[date]) {
        earningsMap[date] = 0;
      }

      earningsMap[date] += b.adminCommission || 0;
    });

    const earnings = Object.entries(earningsMap).map(([date, earnings]) => ({
      date,
      earnings
    }));

    return NextResponse.json({
      success: true,
      earnings
    });

  } catch (error) {

    console.error("ADMIN EARNINGS ERROR:", error);

    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}