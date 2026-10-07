import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import FareConfig from "@/models/fareConfig.model";
import { auth } from "@/auth";
import axios from "axios";
import { calculateFareBreakdown } from "@/lib/fareEngine";
import { haversineDistance } from "@/lib/routeUtils";
import { sendPushToUser } from "@/lib/webPush";
import { findEligibleCandidates } from "@/lib/driverMatchingEngine";
import { idempotency } from "@/lib/idempotency";
import { getRequestId } from "@/lib/apiResponse";

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  try {
    const idempotencyKey = idempotency.getKey(req);
    if (idempotencyKey) {
      const cached = idempotency.get(idempotencyKey);
      if (cached) {
        return NextResponse.json(cached.body, {
          status: cached.status,
          headers: {
            ...cached.headers,
            "X-Request-Id": requestId,
            "X-Cache-Lookup": "HIT",
          },
        });
      }
    }

    await connectDb();

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Please sign in to request a ride", meta: { requestId } },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      pickup,
      drop,
      vehicle, // requested vehicle type: bike, auto, car, loading, truck
      fare,
      mobileNumber, // user's mobile number
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      isSmartPickup,
      smartPickupDetails,
      stops,
      isFamilyRide,
      familyMemberDetails,
      isScheduled,
      scheduledPickupTime,
    } = body;

    const pLat = Number(pickupLat);
    const pLng = Number(pickupLng);
    const dLat = Number(dropLat);
    const dLng = Number(dropLng);

    if (
      !pickup ||
      !drop ||
      !vehicle ||
      isNaN(pLat) ||
      isNaN(pLng) ||
      isNaN(dLat) ||
      isNaN(dLng)
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required pickup/drop coordinates. Please select locations on the map." },
        { status: 400 }
      );
    }

    let parsedScheduledTime: Date | undefined;
    if (isScheduled) {
      if (!scheduledPickupTime) {
        return NextResponse.json(
          { success: false, message: "Scheduled pickup time is required" },
          { status: 400 }
        );
      }
      parsedScheduledTime = new Date(scheduledPickupTime);
      const minAdvanceMs = 20 * 60 * 1000; // at least 20 minutes in advance
      if (isNaN(parsedScheduledTime.getTime()) || parsedScheduledTime.getTime() < Date.now() + minAdvanceMs) {
        return NextResponse.json(
          { success: false, message: "Scheduled pickup time must be at least 25 minutes in advance" },
          { status: 400 }
        );
      }
    }

    // Resolve user mobile number & ensure WhatsApp phone verification
    const currentUser = await User.findById(session.user.id)
      .select("mobileNumber isMobileVerified isStudent studentVerification outstandingAmount")
      .lean();

    if (!currentUser?.mobileNumber || !(currentUser as any)?.isMobileVerified) {
      return NextResponse.json(
        {
          success: false,
          requiresPhoneVerification: true,
          message:
            "Please verify your WhatsApp mobile number before booking a ride.",
        },
        { status: 403 }
      );
    }

    // Check outstanding cancellation balance (Anti-abuse threshold)
    const userOutstanding = Number((currentUser as any)?.outstandingAmount || 0);
    const MAX_OUTSTANDING_THRESHOLD = 150;
    if (userOutstanding >= MAX_OUTSTANDING_THRESHOLD) {
      return NextResponse.json(
        {
          success: false,
          requiresOutstandingSettlement: true,
          outstandingAmount: userOutstanding,
          message: `You have ₹${userOutstanding} in unpaid cancellation dues. Please settle your outstanding balance before requesting a new ride.`,
        },
        { status: 403 }
      );
    }

    const effectiveUserMobile = (currentUser as any)?.mobileNumber;
    const studentVer = (currentUser as any)?.studentVerification;
    const isStudent =
      Boolean((currentUser as any)?.isStudent) &&
      studentVer?.status === "verified" &&
      studentVer?.expiresAt &&
      new Date(studentVer.expiresAt).getTime() > Date.now();

    // Prevent duplicate active booking for instant rides
    if (!isScheduled) {
      const existing = await Booking.findOne({
        user: session.user.id,
        status: {
          $in: ["requested", "awaiting_payment", "confirmed", "started", "auto_rematching"],
        },
        isScheduled: { $ne: true },
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          alreadyActive: true,
          booking: existing,
          message: "Active ride restored",
        });
      }
    }

    // 1️⃣ Find eligible candidate drivers using DriverMatchingEngine
    const vehicleKey = String(vehicle).toLowerCase();
    const matchResult = await findEligibleCandidates({
      pickupLng: pLng,
      pickupLat: pLat,
      vehicleType: vehicleKey,
      maxRadiusKm: 10,
      maxCandidates: 5,
    });

    let nearestVendor: any = null;
    let nearestVehicle: any = null;
    let sortedCandidates: any[] = [];

    if (matchResult.success && matchResult.candidates.length > 0) {
      const topMatch = matchResult.candidates[0];
      nearestVendor = await User.findById(topMatch.driverId).lean();
      nearestVehicle = await Vehicle.findById(topMatch.vehicleId).lean();
      sortedCandidates = matchResult.candidates.map((c) => ({
        _id: c.driverId,
        name: c.driverName,
        mobileNumber: c.driverMobile,
        distance: c.distanceKm,
      }));
    }

    // Fallback in unseeded development environments or demo mode
    if (!nearestVendor || !nearestVehicle) {
      let platformVendor = await User.findOne({ email: "fleet.driver@ridenow.com" });
      if (!platformVendor) {
        platformVendor = await User.create({
          name: "RideNow Partner",
          email: "fleet.driver@ridenow.com",
          role: "vendor",
          isOnline: true,
          vendorStatus: "approved",
          vendorProfileCompleted: true,
          vendorOnboardingStep: 7,
          mobileNumber: "9876543210",
          location: {
            type: "Point",
            coordinates: [pLng, pLat],
          },
        });
      } else {
        await User.findByIdAndUpdate(platformVendor._id, {
          isOnline: true,
          location: {
            type: "Point",
            coordinates: [pLng, pLat],
          },
        });
      }

      let platformVehicle = await Vehicle.findOne({
        owner: platformVendor._id,
        type: vehicleKey,
      });

      if (!platformVehicle) {
        const vehicleModels: Record<string, string> = {
          bike: "Honda Activa 6G",
          auto: "Bajaj Compact RE",
          car: "Maruti Suzuki Swift",
          loading: "Tata Ace Gold",
          truck: "Tata 407",
        };
        platformVehicle = await Vehicle.create({
          owner: platformVendor._id,
          type: vehicleKey,
          number: `RN-${vehicleKey.slice(0, 3).toUpperCase()}-101`,
          vehicleModel: vehicleModels[vehicleKey] || "Standard Vehicle",
          status: "approved",
          isActive: true,
        });
      }

      nearestVendor = platformVendor.toObject ? platformVendor.toObject() : platformVendor;
      nearestVehicle = platformVehicle.toObject ? platformVehicle.toObject() : platformVehicle;
      sortedCandidates = [nearestVendor];
    }

    // Rates from FareConfig collection
    const rates = await FareConfig.find({});
    const ratesMap: Record<string, any> = {};
    rates.forEach((c) => {
      ratesMap[c.vehicleType.toLowerCase()] = {
        baseFare: c.baseFare,
        pricePerKm: c.pricePerKm,
        pricePerMinute: 0,
        multiplier: c.multiplier,
        minDistance: c.minDistance !== undefined ? c.minDistance : 0,
        maxDistance: c.maxDistance !== undefined ? c.maxDistance : 9999,
      };
    });

    const DEFAULT_RATES: Record<string, any> = {
      bike:    { baseFare: 30,  pricePerKm: 9,   pricePerMinute: 0, multiplier: 1.0, minDistance: 0, maxDistance: 15 },
      auto:    { baseFare: 45,  pricePerKm: 13,  pricePerMinute: 0, multiplier: 1.1, minDistance: 0, maxDistance: 30 },
      car:     { baseFare: 75,  pricePerKm: 18,  pricePerMinute: 0, multiplier: 1.25, minDistance: 0, maxDistance: 100 },
      loading: { baseFare: 110, pricePerKm: 22,  pricePerMinute: 0, multiplier: 1.4, minDistance: 0, maxDistance: 150 },
      truck:   { baseFare: 160, pricePerKm: 28,  pricePerMinute: 0, multiplier: 1.6, minDistance: 0, maxDistance: 500 },
    };

    const cfg = ratesMap[vehicleKey] || DEFAULT_RATES[vehicleKey] || DEFAULT_RATES.car;

    let routeDistance = 0;
    if (Array.isArray(stops) && stops.length > 0) {
      const allCoords: [number, number][] = [
        [pLng, pLat],
        ...stops.map((s: any) => [Number(s.lng), Number(s.lat)] as [number, number]),
        [dLng, dLat],
      ];
      for (let i = 0; i < allCoords.length - 1; i++) {
        routeDistance += haversineDistance(allCoords[i], allCoords[i + 1]);
      }
    } else {
      routeDistance = haversineDistance([pLng, pLat], [dLng, dLat]);
    }

    // Validate distance limits
    const min = cfg.minDistance !== undefined ? cfg.minDistance : 0;
    const max = cfg.maxDistance !== undefined ? cfg.maxDistance : 9999;
    if (routeDistance < min) {
      return NextResponse.json(
        {
          success: false,
          message: `Selected vehicle type requires a minimum ride distance of ${min} km (Current: ${routeDistance.toFixed(1)} km)`,
        },
        { status: 400 }
      );
    }
    if (routeDistance > max) {
      return NextResponse.json(
        {
          success: false,
          message: `Selected vehicle type is limited to a maximum ride distance of ${max} km (Current: ${routeDistance.toFixed(1)} km)`,
        },
        { status: 400 }
      );
    }

    // Authoritative distance-only pricing calculation
    const breakdown = calculateFareBreakdown(vehicleKey, routeDistance, ratesMap, undefined, 0, isStudent);
    const calculatedFare = breakdown.totalFare;

    const estimatedDurationMin = Math.max(
      5,
      breakdown.timeMinutes || Math.round((routeDistance / 25) * 60) || 15
    );
    const baseStartTime = parsedScheduledTime ? parsedScheduledTime.getTime() : Date.now();
    const estimatedDropoffTime = new Date(baseStartTime + estimatedDurationMin * 60 * 1000);

    const formattedStops =
      Array.isArray(stops) && stops.length > 0
        ? stops.map((s: any, idx: number) => ({
            address: s.address,
            location: {
              type: "Point" as const,
              coordinates: [Number(s.lng), Number(s.lat)],
            },
            order: s.order || idx + 1,
            completed: false,
          }))
        : undefined;

    const effectiveDriverMobile = nearestVendor.mobileNumber || "9876543210";

    const booking = await Booking.create({
      user: session.user.id,
      driver: nearestVendor._id,
      vehicle: nearestVehicle?._id,
      pickupAddress: pickup,
      dropAddress: drop,
      pickupLocation: {
        type: "Point",
        coordinates: [pLng, pLat],
      },
      dropLocation: {
        type: "Point",
        coordinates: [dLng, dLat],
      },
      isMultiStop: Boolean(formattedStops && formattedStops.length > 0),
      stops: formattedStops,
      isFamilyRide: Boolean(isFamilyRide),
      familyMemberDetails:
        isFamilyRide && familyMemberDetails
          ? {
              name: familyMemberDetails.name,
              relation: familyMemberDetails.relation,
              phone: familyMemberDetails.phone || "",
            }
          : undefined,
      fare: calculatedFare,
      fareBreakdown: breakdown,
      tripDurationMinutes: estimatedDurationMin,
      estimatedDropoffTime,
      adminCommission: Number((calculatedFare * 0.1).toFixed(2)),
      partnerAmount: Number((calculatedFare - calculatedFare * 0.1).toFixed(2)),
      userMobileNumber: effectiveUserMobile,
      driverMobileNumber: effectiveDriverMobile,
      candidateDrivers: sortedCandidates.map((c) => c._id),
      currentDriverIndex: 0,
      shareToken: `rt_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`,
      isSmartPickup: Boolean(isSmartPickup),
      smartPickupDetails:
        isSmartPickup && smartPickupDetails
          ? {
              venueName: smartPickupDetails.venueName,
              spotName: smartPickupDetails.spotName,
              instructions: smartPickupDetails.instructions,
              walkingTimeText: smartPickupDetails.walkingTimeText,
            }
          : undefined,
      isScheduled: Boolean(isScheduled),
      scheduledPickupTime: parsedScheduledTime,
      status: isScheduled ? "scheduled" : "requested",
    });

    // 4️⃣ Safely emit socket event to driver
    try {
      if (process.env.NEXT_PUBLIC_SOCKET_SERVER) {
        const eventName = isScheduled ? "new-scheduled-booking" : "new-booking";
        await axios.post(
          `${process.env.NEXT_PUBLIC_SOCKET_SERVER}/emit`,
          {
            userId: nearestVendor._id.toString(),
            event: eventName,
            data: booking,
          },
          { timeout: 3000 }
        );
      }
    } catch (err) {
      console.warn("Socket emission error (booking still active):", err);
    }

    // 5️⃣ Send Web Push notification to candidate driver
    try {
      await sendPushToUser(nearestVendor._id.toString(), {
        title: isScheduled ? "New Scheduled Ride Request! 📅" : "New Ride Request! 🚨",
        body: `Pickup: ${pickup.length > 35 ? pickup.slice(0, 32) + "..." : pickup} | Fare: ₹${calculatedFare}. Tap to view.`,
        url: "/partner",
        tag: `booking-new-${booking._id.toString()}`,
      });
    } catch (pushErr) {
      console.warn("Web Push to driver failed (continuing):", pushErr);
    }

    const responsePayload = {
      success: true,
      booking,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    if (idempotencyKey) {
      idempotency.set(idempotencyKey, 201, responsePayload);
    }

    return NextResponse.json(responsePayload, {
      status: 201,
      headers: { "X-Request-Id": requestId },
    });
  } catch (error: any) {
    console.error(`[${requestId}] Booking creation error:`, error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create booking",
        meta: { requestId },
      },
      {
        status: 500,
        headers: { "X-Request-Id": requestId },
      }
    );
  }
}