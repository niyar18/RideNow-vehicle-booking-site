export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }

    const sessionUser = await User.findOne({ email: session.user.email })
      .select("_id role")
      .lean();

    if (!sessionUser) {
      return NextResponse.json(
        { message: "User account not found" },
        { status: 404 }
      );
    }

    const id = (await context.params).id;
    const booking: any = await Booking.findById(id).populate("user driver vehicle");

    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found" },
        { status: 404 }
      );
    }

    // Strict Cross-Tenant Resource Isolation:
    // Only the passenger who created the booking, the assigned driver, or an admin can access
    const riderId = booking.user?._id?.toString() || booking.user?.toString();
    const driverId = booking.driver?._id?.toString() || booking.driver?.toString();
    const currentUserId = sessionUser._id.toString();

    const isRider = riderId === currentUserId;
    const isDriver = driverId === currentUserId;
    const isAdmin = sessionUser.role === "admin";

    if (!isRider && !isDriver && !isAdmin) {
      return NextResponse.json(
        { message: "Forbidden: You are not authorized to view this booking" },
        { status: 403 }
      );
    }

    // Security Hardening: Never leak secret OTPs to the driver
    const sanitizedBooking = booking.toObject ? booking.toObject() : { ...booking };
    if (!isRider && !isAdmin) {
      delete sanitizedBooking.pickupOtp;
      delete sanitizedBooking.dropOtp;
    }

    return NextResponse.json(sanitizedBooking);
  } catch (err: any) {
    console.error("GET /api/booking/[id] error:", err);
    return NextResponse.json(
      { message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}