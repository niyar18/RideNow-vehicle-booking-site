export const dynamic = "force-dynamic";
export const revalidate = 0;

import { withoutRiderSecrets } from "@/lib/bookingPrivacy";
import { auth } from "@/auth";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    void Vehicle;

    const session = await auth();
    const user = session?.user;
    if (!user || (!user.id && !user.email && !(user as any).mobileNumber)) {
      return NextResponse.json(
        { message: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }

    const userFilters: any[] = [];
    if (user.id) {
      userFilters.push({ _id: user.id });
    }
    if (user.email) {
      userFilters.push({ email: user.email });
    }
    if ((user as any).mobileNumber) {
      userFilters.push({ mobileNumber: (user as any).mobileNumber });
    }

    const sessionUser = await User.findOne({ $or: userFilters })
      .select("_id role email mobileNumber")
      .lean();

    const id = (await context.params).id;
    const booking: any = await Booking.findById(id)
      .populate("user", "name profilePicture")
      .populate("driver", "name profilePicture avatar rating totalRides")
      .populate("vehicle", "number vehicleModel type imageUrl");

    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found" },
        { status: 404 }
      );
    }

    // Strict Cross-Tenant Resource Isolation:
    // Only the passenger who created the booking, the assigned driver, or an admin can access
    const riderId = (booking.user?._id || booking.user)?.toString();
    const driverId = (booking.driver?._id || booking.driver)?.toString();
    const currentUserId = sessionUser?._id?.toString() || session?.user?.id?.toString();

    const isRider = Boolean(currentUserId && riderId && riderId === currentUserId);
    const isDriver = Boolean(currentUserId && driverId && driverId === currentUserId);
    const isAdmin = sessionUser?.role === "admin";

    if (!isRider && !isDriver && !isAdmin) {
      return NextResponse.json(
        { message: "Forbidden: You are not authorized to view this booking" },
        { status: 403 }
      );
    }

    return NextResponse.json(isRider ? booking : withoutRiderSecrets(booking));
  } catch (err: any) {
    console.error("GET /api/booking/[id] error:", err);
    return NextResponse.json(
      { message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}