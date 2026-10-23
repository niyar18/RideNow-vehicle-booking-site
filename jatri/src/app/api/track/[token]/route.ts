export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";

/**
 * Public ride-tracking endpoint.
 * Intentional data-minimisation: only the fields required to show a map pin
 * and basic trip status are returned. OTPs, user PII, and financial data are
 * never serialised.
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
    /** Masked: "+91 ••••• ••XXX" */
    mobileNumber: string;
    location?: { coordinates: [number, number] };
    avatar?: string;
  } | null;
  /** Masked: "+91 ••••• ••XXX" */
  passengerMobile: string;
  isPanicActive: boolean;
}

function maskPhone(raw: string): string {
  return `+91 ••••• ••${raw.slice(-3)}`;
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
        select: "name mobileNumber location avatar",
      })
      .populate({
        path: "vehicle",
        select: "vehicleModel number type",
      })
      .select(
        // Explicitly whitelist — never include pickupOtp, dropOtp, fare, paymentStatus, or user PII.
        "status pickupAddress dropAddress pickupLocation dropLocation vehicle driver shareToken userMobileNumber isPanicActive"
      )
      .lean();

    if (!booking) {
      return NextResponse.json({ message: "Trip not found" }, { status: 404 });
    }

    const driverDoc = booking.driver as any;
    let driverLocation: { lat: number; lng: number } | undefined;
    if (
      driverDoc?.location?.coordinates &&
      driverDoc.location.coordinates.length >= 2
    ) {
      driverLocation = {
        lng: driverDoc.location.coordinates[0],
        lat: driverDoc.location.coordinates[1],
      };
    }

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
            mobileNumber: driverDoc.mobileNumber
              ? maskPhone(driverDoc.mobileNumber)
              : "",
            location: driverDoc.location?.coordinates?.length >= 2
              ? { coordinates: driverDoc.location.coordinates as [number, number] }
              : undefined,
            avatar: driverDoc.avatar,
          }
        : null,
      passengerMobile: (booking as any).userMobileNumber
        ? maskPhone((booking as any).userMobileNumber)
        : "",
      isPanicActive: Boolean((booking as any).isPanicActive),
    };

    return NextResponse.json({ success: true, booking: dto });
  } catch (err) {
    console.error("Public track API error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
