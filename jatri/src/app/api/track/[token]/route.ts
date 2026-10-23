export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";

/**
 * Public ride-tracking endpoint.
 * Return only data required to identify the trip and render its map.
 * Do not expose contact details, OTPs, user PII, or financial data.
 */
interface PublicTrackingDTO {
  bookingId: string;
  status: string;
  pickupAddress: string;
  dropAddress: string;
  pickupLocation?: { coordinates: [number, number] };
  dropLocation?: { coordinates: [number, number] };
  vehicle: { vehicleModel: string; number: string; type?: string } | null;
  driver: {
    name: string;
    location?: { coordinates: [number, number] };
    avatar?: string;
  } | null;
  isPanicActive: boolean;
}

const TERMINAL_BOOKING_STATUSES = new Set([
  "completed", "cancelled", "rejected", "expired", "payment_failed", "no_drivers_available", "disputed",
]);

function getTrackingExpiry(booking: any): number {
  const explicitExpiry = booking.shareTokenExpiresAt
    ? new Date(booking.shareTokenExpiresAt).getTime()
    : NaN;
  if (Number.isFinite(explicitExpiry)) return explicitExpiry;

  // Legacy records predate shareTokenExpiresAt; apply the same bounded lifetime.
  const scheduled = Boolean(booking.isScheduled && booking.scheduledPickupTime);
  const referenceTime = scheduled
    ? new Date(booking.scheduledPickupTime).getTime()
    : new Date(booking.createdAt).getTime();
  if (!Number.isFinite(referenceTime)) return 0;
  return referenceTime + (scheduled ? 12 : 24) * 60 * 60 * 1000;
}

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
        select: "name location avatar",
      })
      .populate({
        path: "vehicle",
        select: "vehicleModel number type",
      })
      .select(
        // Explicitly whitelist — never include phone numbers, OTPs, fare, payment, or user PII.
        "status pickupAddress dropAddress pickupLocation dropLocation vehicle driver shareTokenExpiresAt createdAt isScheduled scheduledPickupTime isPanicActive"
      )
      .lean();

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Trip not found" },
        { status: 404, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    if (getTrackingExpiry(booking) <= Date.now()) {
      return NextResponse.json(
        { success: false, message: "This tracking link has expired." },
        { status: 410, headers: { "Cache-Control": "no-store, private" } }
      );
    }

    const isLiveTrackingActive = !TERMINAL_BOOKING_STATUSES.has(
      String((booking as any).status || "").toLowerCase()
    );
    const driverDoc = booking.driver as any;

    const dto: PublicTrackingDTO = {
      bookingId: (booking as any)._id.toString(),
      status: (booking as any).status,
      pickupAddress: (booking as any).pickupAddress || "",
      dropAddress: (booking as any).dropAddress || "",
      pickupLocation: (booking as any).pickupLocation?.coordinates
        ? { coordinates: (booking as any).pickupLocation.coordinates as [number, number] }
        : undefined,
      dropLocation: (booking as any).dropLocation?.coordinates
        ? { coordinates: (booking as any).dropLocation.coordinates as [number, number] }
        : undefined,
      vehicle: (booking as any).vehicle
        ? {
            vehicleModel: (booking as any).vehicle.vehicleModel || "",
            number: (booking as any).vehicle.number || "",
            type: (booking as any).vehicle.type || undefined,
          }
        : null,
      driver: driverDoc
        ? {
            name: driverDoc.name || "Driver",
            location: isLiveTrackingActive && driverDoc.location?.coordinates?.length >= 2
              ? { coordinates: driverDoc.location.coordinates as [number, number] }
              : undefined,
            avatar: driverDoc.avatar,
          }
        : null,
      isPanicActive: Boolean((booking as any).isPanicActive),
    };

    return NextResponse.json(
      { success: true, booking: dto },
      { headers: { "Cache-Control": "no-store, private" } }
    );
  } catch (err) {
    console.error("Public track API error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
