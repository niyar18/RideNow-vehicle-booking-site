import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import Vehicle from "@/models/vehicle.model";
import { auth } from "@/auth";
import { calculateCommissionSplit } from "@/lib/commission";
import { sendPushToUser } from "@/lib/webPush";
import { findEligibleCandidates } from "@/lib/driverMatchingEngine";
import { idempotency } from "@/lib/idempotency";
import { getRequestId } from "@/lib/apiResponse";
import { generateSecureOtp } from "@/lib/cryptoOtp";
import { emitSocketEvent } from "@/lib/socketServerEmit";
import { rateLimiter } from "@/lib/rateLimit";
import { reserveStudentDiscount, undoUnattachedStudentDiscount } from "@/lib/studentDiscountEngine";
import { FareQuoteError, getBookingQuote } from "@/lib/bookingQuote.server";
import { normalizeFareVehicle, fareDistanceLimits, type BookingFareQuote } from "@/lib/farePolicy";

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  let unattachedStudentReservation: { userId: string; amount: number } | null = null;
  const priceChanged = (quote?: BookingFareQuote) => NextResponse.json(
    { success: false, code: "FARE_CHANGED", message: "Your fare changed. Review the updated total before requesting the ride.", quote },
    { status: 409 },
  );

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Please sign in to request a ride", meta: { requestId } },
        { status: 401 }
      );
    }

    const requestKey = idempotency.getKey(req);
    const idempotencyKey = requestKey ? `booking:create:${session.user.id}:${requestKey}` : null;
    if (idempotencyKey) {
      const cached = await idempotency.get(idempotencyKey);
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

    const userLimit = rateLimiter.check(`booking:create:${session.user.id}`, 10, 60 * 1000);
    if (!userLimit.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many ride requests. Please wait a moment before trying again.", meta: { requestId } },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") throw new FareQuoteError("Invalid booking request.");

    const {
      pickup,
      drop,
      pickupDetails,
      dropDetails,
      vehicle, // requested vehicle type: bike, auto, car, intercity, loading, truck
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
      serviceMode,
      cargoDetails,
      driverPreference,
      searchRadiusKm,
    } = body;

    const validDriverPreference = driverPreference === "woman" ? "woman" : "any";

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

    const vehicleKey = normalizeFareVehicle(vehicle);
    if (!fareDistanceLimits(vehicleKey)) throw new FareQuoteError("Select a valid vehicle type.");

    const effectiveServiceMode: "passenger" | "logistics" =
      serviceMode === "logistics" || ["loading", "truck"].includes(vehicleKey)
        ? "logistics"
        : "passenger";

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

    const effectiveUserMobile = currentUser.mobileNumber;
    const { quote, distance: routeDistance, routeCoordinates } = await getBookingQuote(
      body, session.user.id, currentUser as Parameters<typeof getBookingQuote>[2],
    );
    const breakdown = quote.breakdown;
    const expectedFare = body.expectedFare ?? body.fare;
    if (typeof expectedFare !== "number" || !Number.isSafeInteger(expectedFare) || expectedFare !== breakdown.totalFare) {
      return priceChanged(quote);
    }

    // Prevent duplicate active booking for instant rides
    if (!isScheduled) {
      const existing = await Booking.findOne({
        user: session.user.id,
        status: {
          $in: ["requested", "searching_driver", "awaiting_payment", "confirmed", "started", "auto_rematching"],
        },
        isScheduled: { $ne: true },
      }).sort({ createdAt: -1 });

      if (existing) {
        const ageMs = existing.createdAt ? Date.now() - new Date(existing.createdAt).getTime() : 0;
        const isStale = ageMs > 2 * 60 * 1000;
        const isSearchingWithoutDriver = ["requested", "searching_driver", "auto_rematching"].includes(existing.status);

        // If the existing booking was an unaccepted search request or is older than 2 minutes,
        // expire it so the user's fresh ride request (with their chosen fleet and fare) can be fulfilled.
        if (isStale || isSearchingWithoutDriver) {
          existing.status = "expired";
          await existing.save();
        } else {
          const populatedExisting = await Booking.findById(existing._id)
            .populate("vehicle", "number vehicleModel type")
            .populate("driver", "name phone profilePhoto rating totalRides")
            .lean();

          return NextResponse.json({
            success: true,
            alreadyActive: true,
            booking: populatedExisting || existing,
            message: "Active ride restored",
          });
        }
      }
    }

    // 1️⃣ Find eligible candidate drivers using DriverMatchingEngine (strictly excluding the requesting passenger)
    const effectiveRadius = Number(searchRadiusKm) > 0 && Number(searchRadiusKm) <= 30 ? Number(searchRadiusKm) : 10;
    const matchResult = await findEligibleCandidates({
      pickupLng: pLng,
      pickupLat: pLat,
      vehicleType: vehicleKey,
      maxRadiusKm: effectiveRadius,
      maxCandidates: 10,
      excludeDriverIds: session.user.id ? [session.user.id] : [],
      driverPreference: validDriverPreference,
      passengerId: session.user.id,
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

    // If no real driver was matched, inform the caller immediately.
    // A ghost/synthetic driver must never be assigned — it misleads the rider
    // with a fake location and cannot actually complete the trip.
    if (!nearestVendor || !nearestVehicle) {
      if (validDriverPreference === "woman") {
        return NextResponse.json(
          {
            success: false,
            noWomenDriversAvailable: true,
            message: "No eligible verified woman drivers are available nearby right now.",
            canExpandSearch: true,
            canSwitchToAny: true,
            meta: { requestId },
          },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          noDriversAvailable: true,
          message:
            "No drivers are available in your area right now. Please try again in a few minutes.",
          meta: { requestId },
        },
        { status: 503 }
      );
    }

    const studentDiscount = breakdown.studentDiscount ?? 0;
    if (breakdown.isStudentDiscountApplied && studentDiscount > 0) {
      const reservation = await reserveStudentDiscount(session.user.id, studentDiscount);
      if (reservation.success && reservation.discountAmount > 0) {
        unattachedStudentReservation = { userId: session.user.id, amount: reservation.discountAmount };
      }
      if (!reservation.success || reservation.discountAmount !== studentDiscount) {
        if (unattachedStudentReservation) {
          await undoUnattachedStudentDiscount(unattachedStudentReservation.userId, unattachedStudentReservation.amount);
          unattachedStudentReservation = null;
        }
        const updated = await getBookingQuote(body, session.user.id, currentUser as Parameters<typeof getBookingQuote>[2]);
        return priceChanged(updated.quote);
      }
    }
    const isStudentReserved = unattachedStudentReservation !== null;
    const isReferralApplied = breakdown.isReferralDiscountApplied === true;
    const referralDiscountAmount = breakdown.referralDiscount ?? 0;
    const calculatedFare = breakdown.totalFare;
    const userOutstanding = breakdown.cancellationDues ?? 0;
    const rideFareOnly = Math.max(0, calculatedFare - userOutstanding);
    const commissionSplit = calculateCommissionSplit(rideFareOnly);

    const estimatedDurationMin = quote.durationMinutes;
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

    const booking = await Booking.create({
      user: session.user.id,
      driver: undefined,
      vehicle: undefined,
      pickupAddress: pickupDetails?.formattedAddress || pickup,
      dropAddress: dropDetails?.formattedAddress || drop,
      pickupDetails: pickupDetails
        ? {
            name: pickupDetails.name || pickup,
            formattedAddress: pickupDetails.formattedAddress || pickup,
            locality: pickupDetails.locality || "",
            city: pickupDetails.city || "",
            state: pickupDetails.state || "",
            postalCode: pickupDetails.postalCode || "",
            placeId: pickupDetails.placeId || "",
          }
        : undefined,
      dropDetails: dropDetails
        ? {
            name: dropDetails.name || drop,
            formattedAddress: dropDetails.formattedAddress || drop,
            locality: dropDetails.locality || "",
            city: dropDetails.city || "",
            state: dropDetails.state || "",
            postalCode: dropDetails.postalCode || "",
            placeId: dropDetails.placeId || "",
          }
        : undefined,
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
      cancellationDuesIncluded: userOutstanding,
      studentDiscountReserved: isStudentReserved,
      isReferralRide: isReferralApplied,
      referralDiscountApplied: referralDiscountAmount,
      routeCoordinates,
      routeDistanceKm: routeDistance,
      tripDurationMinutes: estimatedDurationMin,
      estimatedDropoffTime,
      adminCommission: commissionSplit.adminCommission + userOutstanding,
      partnerAmount: commissionSplit.partnerAmount,
      userMobileNumber: effectiveUserMobile,
      driverMobileNumber: "",
      candidateDrivers: sortedCandidates.map((c) => c._id),
      currentDriverIndex: 0,
      shareToken: `rt_${crypto.randomBytes(16).toString("hex")}`,
      // Public live-tracking links expire 24h after instant requests or 12h after scheduled pickup.
      shareTokenExpiresAt: isScheduled && parsedScheduledTime
        ? new Date(parsedScheduledTime.getTime() + 12 * 60 * 60 * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000),
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
      serviceMode: effectiveServiceMode,
      cargoDetails:
        effectiveServiceMode === "logistics" && cargoDetails
          ? {
              cargoType: cargoDetails.cargoType || "General Goods",
              cargoWeightKg: cargoDetails.cargoWeightKg ? Number(cargoDetails.cargoWeightKg) : undefined,
              receiverContact: cargoDetails.receiverContact || "",
              deliveryNotes: cargoDetails.deliveryNotes || "",
            }
          : undefined,
      pickupOtp: generateSecureOtp(4),
      pickupOtpExpires: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      status: isScheduled ? "scheduled" : "requested",
      driverPreference: validDriverPreference,
      matchingPolicyVersion: "v1",
    });

    unattachedStudentReservation = null;

    // 4️⃣ Safely broadcast socket events and Web Push to ALL candidate drivers simultaneously
    const eventName = isScheduled ? "new-scheduled-booking" : "new-booking";
    for (const candidate of sortedCandidates) {
      try {
        await emitSocketEvent({
          userId: candidate._id.toString(),
          event: eventName,
          data: booking,
        });
      } catch (err) {
        console.warn(`Socket emission error to candidate ${candidate._id}:`, err);
      }

      try {
        await sendPushToUser(candidate._id.toString(), {
          title: isScheduled ? "New Scheduled Ride Request! 📅" : "New Ride Request! 🚨",
          body: `Pickup: ${pickup.length > 35 ? pickup.slice(0, 32) + "..." : pickup} | Fare: ₹${calculatedFare}. Tap to view.`,
          url: "/partner",
          tag: `booking-new-${booking._id.toString()}`,
        });
      } catch (pushErr) {
        console.warn(`Web Push to candidate ${candidate._id} failed (continuing):`, pushErr);
      }
    }

    const populatedBooking = await Booking.findById(booking._id)
      .populate("vehicle", "number vehicleModel type")
      .populate("driver", "name phone profilePhoto rating totalRides")
      .lean();

    const responsePayload = {
      success: true,
      booking: populatedBooking || booking,
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    if (idempotencyKey) {
      await idempotency.set(idempotencyKey, 201, responsePayload);
    }

    return NextResponse.json(responsePayload, {
      status: 201,
      headers: { "X-Request-Id": requestId },
    });
  } catch (error) {
    if (unattachedStudentReservation) {
      try {
        await undoUnattachedStudentDiscount(unattachedStudentReservation.userId, unattachedStudentReservation.amount);
      } catch (releaseError) {
        console.error("Could not release an unattached student fare reservation", releaseError);
      }
    }
    if (error instanceof FareQuoteError) {
      return NextResponse.json({ success: false, message: error.message, ...error.details, meta: { requestId } }, { status: error.status });
    }
    console.error(`[${requestId}] Booking creation error:`, error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create booking. Please try again.",
        meta: { requestId },
      },
      {
        status: 500,
        headers: { "X-Request-Id": requestId },
      }
    );
  }
}
