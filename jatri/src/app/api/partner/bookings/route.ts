export const dynamic = "force-dynamic";
export const revalidate = 0;

import { driverBookingProjection } from "@/lib/bookingPrivacy";
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import { auth } from "@/auth";
import { parsePagination, getRequestId } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  const requestId = getRequestId(req);
  try {
    await connectDb();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", meta: { requestId } },
        { status: 401 }
      );
    }

    const { page, limit, skip } = parsePagination(req, 20, 100);
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const query: any = { driver: session.user.id };
    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter;
    }

    const [total, bookings] = await Promise.all([
      Booking.countDocuments(query),
      Booking.find(query)
        .select(driverBookingProjection)
        .populate({
          path: "vehicle",
          select: "vehicleModel imageUrl type number",
        })
        .populate({
          path: "user",
          select: "name image mobileNumber",
        })
        .populate({
          path: "driver",
          select: "name",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json(
      {
        success: true,
        bookings: bookings || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          "X-Request-Id": requestId,
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error(`[${requestId}] PARTNER BOOKINGS API ERROR:`, error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch partner bookings",
        error: error.message,
        meta: { requestId },
      },
      { status: 500, headers: { "X-Request-Id": requestId } }
    );
  }
}