export const dynamic = "force-dynamic";
export const revalidate = 0;

import { dispatchOfferProjection } from "@/lib/bookingPrivacy";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { Types } from "mongoose";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDb();

    /* ===== AUTH CHECK ===== */
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Unauthorized", bookings: [] },
        { status: 401 }
      );
    }

    const sessionId = session.user.id;
    const driver = sessionId && Types.ObjectId.isValid(sessionId)
      ? await User.findById(sessionId).select("_id role isVendorBlocked").lean()
      : session.user.email
        ? await User.findOne({ email: session.user.email }).select("_id role isVendorBlocked").lean()
        : null;

    if (!driver || driver.isVendorBlocked || (driver.role !== "vendor" && String(driver.role) !== "driver")) {
      return NextResponse.json(
        { message: "Forbidden", bookings: [] },
        { status: 403 }
      );
    }

    /* ===== FETCH PENDING BOOKINGS DISPATCHED TO THIS DRIVER ===== */
    // Match recent unaccepted requests within active dispatch horizon (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const bookings = await Booking.find({
      $or: [
        { candidateDrivers: driver._id },
        { driver: driver._id },
        // Preserve open matching only when no driver or candidates have been selected.
        { driver: null, "candidateDrivers.0": { $exists: false } },
      ],
      status: { $in: ["requested", "searching_driver"] },
      createdAt: { $gte: fiveMinutesAgo },
    })
      .select(dispatchOfferProjection)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      bookings: bookings || [],
    });
  } catch (error) {
    console.error("Pending Bookings Error:", error);

    return NextResponse.json(
      { message: "Server Error", bookings: [] },
      { status: 500 }
    );
  }
}