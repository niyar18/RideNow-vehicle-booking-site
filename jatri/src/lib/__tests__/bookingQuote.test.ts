import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateFareBreakdown } from "@/lib/fareEngine";
import { fareDistanceLimits, isFareDistanceEligible, mergeFareRates, pricingVehicleForChoice } from "@/lib/farePolicy";
import { getBookingQuote } from "@/lib/bookingQuote.server";
import { GET as getPublicRates } from "@/app/api/vehicles/pricing/route";
import { POST as requestQuote } from "@/app/api/booking/quote/route";
import { POST as createBooking } from "@/app/api/booking/create/route";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  db: vi.fn(),
  tariffRows: vi.fn(),
  tariffWrites: vi.fn(),
  route: vi.fn(),
  referral: vi.fn(),
  student: vi.fn(),
  reserve: vi.fn(),
  undoReservation: vi.fn(),
  match: vi.fn(),
  bookingFind: vi.fn(),
  bookingCreate: vi.fn(),
  emit: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.authenticate }));
vi.mock("@/lib/db", () => ({ default: mocks.db }));
vi.mock("@/models/fareConfig.model", () => ({
  default: { find: () => ({ lean: mocks.tariffRows }), findOneAndUpdate: mocks.tariffWrites },
}));
vi.mock("@/lib/valhalla", () => ({ getAuthoritativeRoadDistance: mocks.route }));
vi.mock("@/lib/referralEngine", () => ({ evaluateReferralDiscountForBooking: mocks.referral }));
vi.mock("@/lib/studentDiscountEngine", () => ({
  getStudentMonthlyStatus: mocks.student,
  reserveStudentDiscount: mocks.reserve,
  undoUnattachedStudentDiscount: mocks.undoReservation,
}));
vi.mock("@/lib/driverMatchingEngine", () => ({ findEligibleCandidates: mocks.match }));
vi.mock("@/lib/webPush", () => ({ sendPushToUser: vi.fn() }));
vi.mock("@/lib/socketServerEmit", () => ({ emitSocketEvent: mocks.emit }));
vi.mock("@/lib/rateLimit", () => ({ rateLimiter: { check: () => ({ allowed: true }) } }));
vi.mock("@/models/user.model", () => ({ default: {
  findById: () => ({
    select: () => ({ lean: () => ({ mobileNumber: "0000000000", isMobileVerified: true, outstandingAmount: 18 }) }),
    lean: () => ({ _id: "test-driver", mobileNumber: "0000000000" }),
  }),
} }));
vi.mock("@/models/vehicle.model", () => ({ default: { findById: () => ({ lean: () => ({ _id: "test-vehicle" }) }) } }));
vi.mock("@/models/booking.model", () => ({ default: {
  findOne: () => ({ sort: mocks.bookingFind }),
  create: mocks.bookingCreate,
  findById: () => ({ populate: () => ({ populate: () => ({ lean: () => null }) }) }),
} }));

const route = {
  vehicle: "auto", pickup: "Pickup", drop: "Destination",
  pickupLat: 26.18, pickupLng: 91.75, dropLat: 26.19, dropLng: 91.74,
};
const road = { distanceKm: 8.1, durationMinutes: 24, engine: "osrm", geojsonCoords: [[91.75, 26.18], [91.74, 26.19]] };
const makeRequest = (path: string, value: unknown) => new Request(`http://localhost${path}`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value),
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticate.mockResolvedValue({ user: { id: "test-rider" } });
  mocks.tariffRows.mockResolvedValue([{ vehicleType: "auto", baseFare: 39.25, pricePerKm: 12.2, taxRate: 0.07 }]);
  mocks.route.mockResolvedValue(road);
  mocks.referral.mockResolvedValue({ isEligible: false, discountAmount: 0 });
  mocks.bookingFind.mockResolvedValue(null);
  mocks.match.mockResolvedValue({ success: true, candidates: [{ driverId: "test-driver", vehicleId: "test-vehicle" }] });
  mocks.bookingCreate.mockImplementation(async (value) => ({ ...value, _id: "test-booking" }));
});

describe("canonical tariff and eligibility", () => {
  it("returns actual persisted prices without updating the database", async () => {
    const response = await Reflect.apply(getPublicRates, undefined, [new Request("http://localhost/api/vehicles/pricing?sync=true")]);
    const data = await response.json();
    expect(data.rates.auto).toMatchObject({ baseFare: 39.25, pricePerKm: 12.2, taxRate: 0.07, maxDistance: 35 });
    expect(mocks.tariffWrites).not.toHaveBeenCalled();
  });

  it("keeps present zero charges and rejects invalid overrides", () => {
    const rates = mergeFareRates([{ vehicleType: "TOTO", platformFee: 0, taxRate: 0, pricePerKm: -4, multiplier: NaN }]);
    expect(rates["e-rickshaw"]).toMatchObject({ platformFee: 0, taxRate: 0, pricePerKm: 8, multiplier: 1 });
  });

  it("keeps the local fleet cutoff while switching the long-distance car choice to the existing intercity tariff", () => {
    const rates = mergeFareRates([{ vehicleType: "auto", maxDistance: 17 }]);
    expect(fareDistanceLimits("auto", rates)).toEqual({ min: 0, max: 17 });
    expect(isFareDistanceEligible("auto", 17.01, rates)).toBe(false);
    expect(pricingVehicleForChoice("car", 100)).toBe("car");
    expect(pricingVehicleForChoice("car", 100.01)).toBe("intercity");
    expect(isFareDistanceEligible("car", 100.01)).toBe(false);
    expect(isFareDistanceEligible("intercity", 100.01)).toBe(true);
    expect(isFareDistanceEligible("intercity", 501)).toBe(false);
  });

  it("reconciles decimal custom fees into the same whole INR fare, and discounts cannot offset cancellation dues", () => {
    const rates = mergeFareRates([{ vehicleType: "bike", baseFare: 12.36, platformFee: 2.92, taxRate: 0.07 }]);
    const item = calculateFareBreakdown("bike", 2.26, rates);
    expect(Math.round((item.baseFare + item.distanceFare + item.surgeAmount + item.platformFee + item.taxes - item.discount +
      (item.roundingAdjustment ?? 0) + (item.cancellationDues ?? 0)) * 100)).toBe(item.totalFare * 100);
    const promoted = calculateFareBreakdown("bike", 2.26, rates, undefined, 999, false, undefined, undefined, 18);
    expect(promoted.totalFare).toBe(18);
    expect(promoted.discount).toBeLessThan(999);
  });
});

describe("server fare quote and booking", () => {
  it("uses the actual route, tariff and outstanding dues, ignoring client-supplied distance and amount", async () => {
    const response = await requestQuote(makeRequest("/api/booking/quote", { ...route, distanceKm: 0.1, fare: 1, cancellationDues: 0 }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.quote).toMatchObject({
      breakdown: { vehicleType: "auto", distanceKm: 8.1, baseFare: 39.25, taxRate: 0.07, cancellationDues: 18 },
      durationMinutes: 24, estimatedRoute: false,
    });
    expect(mocks.route).toHaveBeenCalledWith([[26.18, 91.75], [26.19, 91.74]], { timeoutMs: 2500 });
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
    expect(mocks.reserve).not.toHaveBeenCalled();
  });

  it("labels provider fallback and rejects invalid coordinates or a route beyond the selected class", async () => {
    mocks.route.mockResolvedValue({ ...road, engine: "fallback" });
    await expect(getBookingQuote(route, "test-rider", {})).resolves.toMatchObject({ quote: { estimatedRoute: true } });
    await expect(getBookingQuote({ ...route, pickupLat: null }, "test-rider", {})).rejects.toMatchObject({ status: 400 });
    await expect(getBookingQuote({ ...route, stops: [{ lat: NaN, lng: 91.2 }] }, "test-rider", {})).rejects.toMatchObject({ status: 400 });
    mocks.route.mockResolvedValue({ ...road, distanceKm: 101 });
    await expect(getBookingQuote({ ...route, vehicle: "car" }, "test-rider", {})).rejects.toMatchObject({ details: { isServiceUnavailable: true, alternateVehicle: "intercity" } });
    await expect(getBookingQuote({ ...route, vehicle: "intercity" }, "test-rider", {})).resolves.toMatchObject({
      quote: { breakdown: { vehicleType: "intercity", baseFare: 250 } },
    });
  });

  it("uses the remaining student allowance without writing or stacking the referral in the quote", async () => {
    mocks.student.mockResolvedValue({ remainingAllowance: 4, remainingRides: 1 });
    const { quote } = await getBookingQuote(route, "test-rider", {
      isStudent: true, studentVerification: { status: "verified", expiresAt: "2099-01-01" },
    });
    expect(quote.breakdown.studentDiscount).toBe(4);
    expect(mocks.student).toHaveBeenCalledWith("test-rider", { readOnly: true });
    expect(mocks.referral).not.toHaveBeenCalled();
    expect(mocks.reserve).not.toHaveBeenCalled();
  });

  it("requires a fresh review before matching or dispatch when the fare differs, then persists the exact reviewed amount", async () => {
    const response = await createBooking(makeRequest("/api/booking/create", { ...route, expectedFare: 1 }));
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.code).toBe("FARE_CHANGED");
    expect(mocks.match).not.toHaveBeenCalled();
    expect(mocks.bookingFind).not.toHaveBeenCalled();
    expect(mocks.bookingCreate).not.toHaveBeenCalled();
    const accepted = await createBooking(makeRequest("/api/booking/create", { ...route, expectedFare: data.quote.breakdown.totalFare }));
    expect(accepted.status).toBe(201);
    expect(mocks.bookingCreate).toHaveBeenCalledWith(expect.objectContaining({
      fare: data.quote.breakdown.totalFare,
      fareBreakdown: data.quote.breakdown,
      routeDistanceKm: 8.1,
      cancellationDuesIncluded: 18,
    }));
  });

  it("returns 401 before reading rates for an unauthenticated quote", async () => {
    mocks.authenticate.mockResolvedValue(null);
    const response = await requestQuote(makeRequest("/api/booking/quote", route));
    expect(response.status).toBe(401);
    expect(mocks.tariffRows).not.toHaveBeenCalled();
  });
});
