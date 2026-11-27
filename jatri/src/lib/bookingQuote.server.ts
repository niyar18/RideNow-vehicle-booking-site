import { calculateFareBreakdown } from "@/lib/fareEngine";
import { LOCAL_FLEET_LIMIT_KM, fareDistanceLimits, isFareDistanceEligible, normalizeFareVehicle, type BookingFareQuote } from "@/lib/farePolicy";
import { loadFareRates } from "@/lib/fareRates.server";
import { estimateMultiStopRoadDistanceKm } from "@/lib/routeUtils";
import { getAuthoritativeRoadDistance } from "@/lib/valhalla";
import { getStudentMonthlyStatus } from "@/lib/studentDiscountEngine";
import { evaluateReferralDiscountForBooking } from "@/lib/referralEngine";

export const MAX_OUTSTANDING_THRESHOLD = 150;

export class FareQuoteError extends Error {
  constructor(message: string, public status = 400, public details: Record<string, unknown> = {}) {
    super(message);
  }
}

export interface FareQuoteUser {
  outstandingAmount?: number;
  isStudent?: boolean;
  studentVerification?: { status?: string; expiresAt?: Date | string | null } | null;
}

type Point = [number, number];
type RouteInput = Record<string, unknown>;

function point(lat: unknown, lng: unknown): Point {
  const numeric = (value: unknown) => {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim()) return Number(value);
    return NaN;
  };
  const a = numeric(lat);
  const b = numeric(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 180) {
    throw new FareQuoteError("Select valid pickup, destination and stop locations on the map.");
  }
  return [a, b];
}

export async function getBookingQuote(input: RouteInput, userId: string, user: FareQuoteUser) {
  const vehicle = normalizeFareVehicle(input.vehicle);
  if (!fareDistanceLimits(vehicle)) throw new FareQuoteError("Select a valid vehicle type.");
  const cargoVehicle = vehicle === "loading" || vehicle === "truck";
  if (input.serviceMode === "logistics" && !cargoVehicle) {
    throw new FareQuoteError("Select a cargo vehicle for goods transport.");
  }
  const dues = Number.isFinite(user.outstandingAmount) ? Math.max(0, Math.round(user.outstandingAmount ?? 0)) : 0;
  if (dues >= MAX_OUTSTANDING_THRESHOLD) {
    throw new FareQuoteError(
      `You have ₹${dues} in unpaid cancellation dues. Settle your balance before requesting another ride.`,
      403,
      { requiresOutstandingSettlement: true, outstandingAmount: dues },
    );
  }

  const pickup = point(input.pickupLat, input.pickupLng);
  const drop = point(input.dropLat, input.dropLng);
  const stops = input.stops ?? [];
  if (!Array.isArray(stops) || stops.length > 2) throw new FareQuoteError("Select up to two stops.");
  const waypoints: Point[] = [
    pickup,
    ...stops.map((stop) => {
      if (!stop || typeof stop !== "object") throw new FareQuoteError("Select valid stops on the map.");
      return point(stop.lat, stop.lng);
    }),
    drop,
  ];
  const rates = await loadFareRates();
  let distance = 0;
  let duration = 0;
  let estimatedRoute = true;
  let routeCoordinates: Point[] = waypoints.map(([lat, lng]) => [lng, lat]);
  try {
    const route = await getAuthoritativeRoadDistance(waypoints, { timeoutMs: 2500 });
    if (Number.isFinite(route.distanceKm) && route.distanceKm > 0) {
      distance = route.distanceKm;
      duration = route.durationMinutes;
      estimatedRoute = route.engine === "fallback";
      if (route.geojsonCoords?.length) routeCoordinates = route.geojsonCoords;
    }
  } catch (error) {
    console.warn("Booking route unavailable; using distance estimate", error);
  }

  if (distance <= 0) distance = estimateMultiStopRoadDistanceKm(waypoints);
  if (distance <= 0) throw new FareQuoteError("Select a different destination or add a valid stop.");
  const limits = fareDistanceLimits(vehicle, rates)!;
  if (distance < limits.min || distance > limits.max) {
    if (!cargoVehicle && vehicle !== "intercity" && distance > LOCAL_FLEET_LIMIT_KM && isFareDistanceEligible("intercity", distance, rates)) {
      throw new FareQuoteError(
        `The road route is ${distance.toFixed(2)} km, beyond this local vehicle’s range. Get a separate Jaatri Intercity quote to continue.`,
        400,
        { isServiceUnavailable: true, alternateVehicle: "intercity" },
      );
    }
    throw new FareQuoteError(
      `This vehicle serves routes up to ${limits.max} km${limits.min ? `, with a ${limits.min} km minimum` : ""}. This route is ${distance.toFixed(2)} km. Choose another vehicle.`,
      400,
      { isServiceUnavailable: true },
    );
  }

  const verification = user.studentVerification;
  const isStudent = Boolean(user.isStudent && verification?.status === "verified" &&
    verification.expiresAt && new Date(verification.expiresAt).getTime() > Date.now());
  const student = isStudent ? await getStudentMonthlyStatus(userId, { readOnly: true }) : null;
  const breakdown = calculateFareBreakdown(vehicle, distance, rates, undefined, 0, isStudent, undefined, student ? {
    remainingMonthlyAllowance: student.remainingAllowance,
    remainingMonthlyRides: student.remainingRides,
  } : undefined, dues);

  if (!breakdown.isStudentDiscountApplied) {
    const referral = await evaluateReferralDiscountForBooking({
      userId,
      baseFare: breakdown.baseFare + breakdown.distanceFare,
      readOnly: true,
    });
    const discount = Math.min(Math.max(0, breakdown.totalFare - dues), Math.max(0, Math.round(referral.discountAmount)));
    if (referral.isEligible && discount > 0) {
      breakdown.isReferralDiscountApplied = true;
      breakdown.referralDiscount = discount;
      breakdown.discount += discount;
      breakdown.totalFare -= discount;
    }
  }

  const durationMinutes = Math.max(5, duration || breakdown.timeMinutes);
  breakdown.timeMinutes = durationMinutes;
  const quote: BookingFareQuote = { breakdown, durationMinutes, estimatedRoute };
  return { quote, distance, routeCoordinates };
}
