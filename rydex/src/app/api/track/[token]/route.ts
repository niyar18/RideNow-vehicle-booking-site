import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    await connectDb();
    const token = (await context.params).token;

    if (!token) {
      return NextResponse.json({ message: "Invalid tracking token" }, { status: 400 });
    }

    const booking = await Booking.findOne({ shareToken: token })
      .populate({
        path: "driver",
        select: "name vehicle location avatar",
      })
      .populate("vehicle");

    if (!booking) {
      return NextResponse.json({ message: "Trip not found" }, { status: 404 });
    }

    // Mask phone numbers for public privacy
    const bookingObj = booking.toObject();
    if (bookingObj.userMobileNumber) {
      const raw = bookingObj.userMobileNumber;
      bookingObj.userMobileNumber = `+91 ••••• ••${raw.slice(-3)}`;
    }
    if (bookingObj.driverMobileNumber) {
      const raw = bookingObj.driverMobileNumber;
      bookingObj.driverMobileNumber = `+91 ••••• ••${raw.slice(-3)}`;
    }

    return NextResponse.json({ success: true, booking: bookingObj });
  } catch (err) {
    console.error("Public track API error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
