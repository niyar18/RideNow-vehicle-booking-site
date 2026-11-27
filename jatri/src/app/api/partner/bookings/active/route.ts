export const dynamic = "force-dynamic";
export const revalidate = 0;

import { driverBookingProjection } from "@/lib/bookingPrivacy";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { auth } from "@/auth";

export async function GET() {
  try {
    await connectDb();
    void Vehicle;

  const session = await auth();
  const user = session?.user;
  if (!user || (!user.id && !user.email && !(user as any).mobileNumber)) {
    return NextResponse.json(null);
  }

  const driverIds: any[] = [];
  if (user.id) {
    driverIds.push(user.id);
    try {
      driverIds.push(new Types.ObjectId(user.id));
    } catch (_) {}
  }

  // Also query user document if email or phone exists to get canonical driver _id
  if (user.email || (user as any).mobileNumber) {
    try {
      const userDoc = await User.findOne({
        $or: [
          ...(user.email ? [{ email: user.email }] : []),
          ...((user as any).mobileNumber ? [{ mobileNumber: (user as any).mobileNumber }] : []),
        ],
      }).select("_id").lean();

      if (userDoc?._id) {
        const idStr = userDoc._id.toString();
        if (!driverIds.includes(idStr)) driverIds.push(idStr);
        try {
          driverIds.push(new Types.ObjectId(idStr));
        } catch (_) {}
      }
    } catch (_) {}
  }

  if (driverIds.length === 0) {
    return NextResponse.json(null);
  }

  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const booking: any = await Booking.findOne({
    driver: { $in: driverIds },
    $or: [
      {
        status: {
          $in: [
            "driver_assigned",
            "confirmed",
            "driver_arriving",
            "driver_arrived",
            "started",
            "ride_started",
            "ride_in_progress",
          ],
        },
        updatedAt: { $gte: sixHoursAgo },
      },
      {
        status: "awaiting_payment",
        updatedAt: { $gte: tenMinutesAgo },
      },
    ],
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .select(driverBookingProjection)
    .populate("user", "name profilePicture")
    .populate("driver", "name profilePicture")
    .populate("vehicle", "number vehicleModel type imageUrl")
    .lean();

  if (!booking) return NextResponse.json(null);

  const bookingObj: any = { ...booking };
  if (bookingObj.userMobileNumber) {
    const raw = bookingObj.userMobileNumber;
    const suffix = raw.slice(-3);
    const prefix = raw.startsWith("+") ? raw.slice(0, 3) : "";
    bookingObj.userMobileNumber = `${prefix} ••••• ••${suffix}`;
  }

  return NextResponse.json(bookingObj);
  } catch (err) {
    console.error("Partner active booking error:", err);
    return NextResponse.json(null);
  }
}