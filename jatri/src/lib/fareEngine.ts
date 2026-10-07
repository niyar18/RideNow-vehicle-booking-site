/**
 * RideNow Pricing Engine (Phase 6 Architecture)
 * Authoritative distance-only upfront pricing, dynamic waiting charge calculations,
 * transparent itemized fare breakdown, and route recalculation.
 */

export interface IFareBreakdown {
  vehicleType: string;
  baseFare: number;
  distanceKm: number;
  pricePerKm: number;
  distanceFare: number;
  timeMinutes: number; // Informational ETA only, NEVER added to pricing
  pricePerMinute: number; // Always 0 (Distance-only authoritative pricing)
  timeFare: number; // Always 0
  waitingMinutes: number;
  waitingCharge: number;
  platformFee: number;
  surgeMultiplier: number;
  surgeAmount: number;
  taxes: number;
  taxRate: number;
  discount: number;
  promoDiscount?: number;
  isStudentDiscountApplied?: boolean;
  studentDiscount?: number;
  totalFare: number;
  cancellationFee: number;
}

export interface VehicleRateConfig {
  baseFare: number;
  pricePerKm: number;
  pricePerMinute: number;
  waitingChargePerMinute: number;
  freeWaitingMinutes: number;
  platformFee: number;
  taxRate: number;
  cancellationFee: number;
  multiplier: number;
  minDistance: number;
  maxDistance: number;
}

export const DEFAULT_VEHICLE_RATES: Record<string, VehicleRateConfig> = {
  bike: {
    baseFare: 30,
    pricePerKm: 9,
    pricePerMinute: 0,
    waitingChargePerMinute: 1.5,
    freeWaitingMinutes: 3,
    platformFee: 15,
    taxRate: 0.05,
    cancellationFee: 30,
    multiplier: 1.0,
    minDistance: 0,
    maxDistance: 15,
  },
  auto: {
    baseFare: 45,
    pricePerKm: 13,
    pricePerMinute: 0,
    waitingChargePerMinute: 2.0,
    freeWaitingMinutes: 3,
    platformFee: 15,
    taxRate: 0.05,
    cancellationFee: 40,
    multiplier: 1.1,
    minDistance: 0,
    maxDistance: 30,
  },
  car: {
    baseFare: 75,
    pricePerKm: 18,
    pricePerMinute: 0,
    waitingChargePerMinute: 2.5,
    freeWaitingMinutes: 4,
    platformFee: 15,
    taxRate: 0.05,
    cancellationFee: 50,
    multiplier: 1.25,
    minDistance: 0,
    maxDistance: 100,
  },
  loading: {
    baseFare: 110,
    pricePerKm: 22,
    pricePerMinute: 0,
    waitingChargePerMinute: 3.5,
    freeWaitingMinutes: 5,
    platformFee: 20,
    taxRate: 0.05,
    cancellationFee: 75,
    multiplier: 1.4,
    minDistance: 0,
    maxDistance: 150,
  },
  truck: {
    baseFare: 160,
    pricePerKm: 28,
    pricePerMinute: 0,
    waitingChargePerMinute: 5.0,
    freeWaitingMinutes: 10,
    platformFee: 30,
    taxRate: 0.05,
    cancellationFee: 100,
    multiplier: 1.6,
    minDistance: 0,
    maxDistance: 500,
  },
};

/**
 * Calculates waiting fee incurred when driver waits for passenger at pickup location.
 */
export function calculateWaitingFee(
  arrivedAt?: Date | string | null,
  startedAt?: Date | string | null,
  ratePerMinute: number = 2.5,
  freeMinutes: number = 3
): { waitingMinutes: number; billableMinutes: number; waitingCharge: number } {
  if (!arrivedAt || !startedAt) {
    return { waitingMinutes: 0, billableMinutes: 0, waitingCharge: 0 };
  }

  const arrivalMs = new Date(arrivedAt).getTime();
  const startMs = new Date(startedAt).getTime();

  if (isNaN(arrivalMs) || isNaN(startMs) || startMs <= arrivalMs) {
    return { waitingMinutes: 0, billableMinutes: 0, waitingCharge: 0 };
  }

  const totalWaitMinutes = Math.floor((startMs - arrivalMs) / (60 * 1000));
  const billableMinutes = Math.max(0, totalWaitMinutes - freeMinutes);
  const waitingCharge = Math.round(billableMinutes * ratePerMinute);

  return {
    waitingMinutes: totalWaitMinutes,
    billableMinutes,
    waitingCharge,
  };
}

export interface StudentProgramEconomics {
  discountPercentage?: number;
  maxDiscountCap?: number;
  minFare?: number;
  eligibleVehicleTypes?: string[];
  allowStackingWithPromo?: boolean;
}

export const DEFAULT_STUDENT_CONFIG: Required<StudentProgramEconomics> = {
  discountPercentage: 10,
  maxDiscountCap: 50,
  minFare: 100,
  eligibleVehicleTypes: ["bike", "auto", "car"],
  allowStackingWithPromo: false,
};

/**
 * Calculates authoritative upfront or final fare breakdown.
 */
export function calculateFareBreakdown(
  vehicleType: string,
  distanceKm: number,
  customRates?: any,
  overrideSurge?: number,
  discountAmount: number = 0,
  isStudent: boolean = false,
  waitingDetails?: { arrivedAt?: Date | string | null; startedAt?: Date | string | null },
  studentSettings?: StudentProgramEconomics
): IFareBreakdown {
  const vType = (vehicleType || "car").toLowerCase();
  const source = customRates || DEFAULT_VEHICLE_RATES;
  const cfg = source[vType] || DEFAULT_VEHICLE_RATES.car;

  const baseFare = cfg.baseFare;
  const pricePerKm = cfg.pricePerKm;
  const platformFee = cfg.platformFee !== undefined ? cfg.platformFee : 15;
  const taxRate = cfg.taxRate !== undefined ? cfg.taxRate : 0.05;
  const cancellationFee = cfg.cancellationFee !== undefined ? cfg.cancellationFee : 50;

  const distKm = Math.max(0, Number(distanceKm.toFixed(1)));
  const distanceFare = Math.round(distKm * pricePerKm);

  // Time estimate: Informational ETA only, NEVER factored into fare calculation
  const timeMinutes = Math.max(3, Math.round((distKm / 25) * 60));

  // Waiting charge calculation
  let waitingMinutes = 0;
  let waitingCharge = 0;
  if (waitingDetails?.arrivedAt && waitingDetails?.startedAt) {
    const waitResult = calculateWaitingFee(
      waitingDetails.arrivedAt,
      waitingDetails.startedAt,
      cfg.waitingChargePerMinute || 2.5,
      cfg.freeWaitingMinutes || 3
    );
    waitingMinutes = waitResult.waitingMinutes;
    waitingCharge = waitResult.waitingCharge;
  }

  const surgeMultiplier = overrideSurge || cfg.multiplier || 1.0;

  // Raw Subtotal = Base Fare + Distance Fare (strictly distance-based)
  const rawSubtotal = baseFare + distanceFare;
  const surgeAmount = Math.round(rawSubtotal * (surgeMultiplier - 1));

  const subtotalWithSurge = rawSubtotal + surgeAmount + waitingCharge;
  const taxes = Math.round((subtotalWithSurge + platformFee) * taxRate); // 5% GST

  // Student Program Economics (10% capped at ₹50, min fare ₹100, regular rides only)
  const stuCfg = { ...DEFAULT_STUDENT_CONFIG, ...studentSettings };
  const isVehicleEligible = stuCfg.eligibleVehicleTypes.map((t) => t.toLowerCase()).includes(vType);

  let calculatedStudentDiscount = 0;
  if (isStudent && isVehicleEligible && subtotalWithSurge >= stuCfg.minFare) {
    const rawDiscount = Math.round(subtotalWithSurge * (stuCfg.discountPercentage / 100));
    calculatedStudentDiscount = Math.min(rawDiscount, stuCfg.maxDiscountCap);
  }

  // Anti-Stacking Architecture: Student discount OR Promo discount (never stacked additively)
  let effectiveDiscount = 0;
  let promoDiscountApplied = 0;
  let studentDiscountApplied = 0;

  if (stuCfg.allowStackingWithPromo) {
    effectiveDiscount = discountAmount + calculatedStudentDiscount;
    promoDiscountApplied = discountAmount;
    studentDiscountApplied = calculatedStudentDiscount;
  } else {
    if (discountAmount > 0) {
      if (discountAmount >= calculatedStudentDiscount) {
        effectiveDiscount = discountAmount;
        promoDiscountApplied = discountAmount;
        studentDiscountApplied = 0;
      } else {
        effectiveDiscount = calculatedStudentDiscount;
        promoDiscountApplied = 0;
        studentDiscountApplied = calculatedStudentDiscount;
      }
    } else {
      effectiveDiscount = calculatedStudentDiscount;
      studentDiscountApplied = calculatedStudentDiscount;
      promoDiscountApplied = 0;
    }
  }

  const totalBeforeDiscount = subtotalWithSurge + platformFee + taxes;
  const totalFare = Math.max(0, Math.round(totalBeforeDiscount - effectiveDiscount));

  return {
    vehicleType: vType,
    baseFare,
    distanceKm: distKm,
    pricePerKm,
    distanceFare,
    timeMinutes,
    pricePerMinute: 0,
    timeFare: 0,
    waitingMinutes,
    waitingCharge,
    platformFee,
    surgeMultiplier,
    surgeAmount,
    taxes,
    taxRate,
    discount: effectiveDiscount,
    promoDiscount: promoDiscountApplied,
    isStudentDiscountApplied: studentDiscountApplied > 0,
    studentDiscount: studentDiscountApplied,
    totalFare,
    cancellationFee,
  };
}

/**
 * Recalculates final ride fare when route changes, stops are added, or waiting time is incurred.
 */
export function recalculateTripFare(
  initialBreakdown: IFareBreakdown,
  actualDistanceKm: number,
  waitingDetails?: { arrivedAt?: Date | string | null; startedAt?: Date | string | null }
): IFareBreakdown {
  return calculateFareBreakdown(
    initialBreakdown.vehicleType,
    actualDistanceKm,
    undefined,
    initialBreakdown.surgeMultiplier,
    initialBreakdown.promoDiscount || 0,
    Boolean(initialBreakdown.isStudentDiscountApplied),
    waitingDetails
  );
}
