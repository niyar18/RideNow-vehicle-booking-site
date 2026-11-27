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
  isReferralDiscountApplied?: boolean;
  referralDiscount?: number;
  totalFare: number;
  cancellationFee: number;
  cancellationDues?: number;
  roundingAdjustment?: number;
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

/**
 * RideNow Canonical Vehicle Rates (Phase 6 Architecture).
 * Baseline multiplier is 1.0 (no artificial surge during normal hours).
 * Standardized across all 8 Jaatri fleets + Intercity.
 */
export const DEFAULT_VEHICLE_RATES: Record<string, VehicleRateConfig> = {
  scooty: {
    baseFare: 20,
    pricePerKm: 7.0,
    pricePerMinute: 0,
    waitingChargePerMinute: 1.5,
    freeWaitingMinutes: 3,
    platformFee: 10,
    taxRate: 0.05,
    cancellationFee: 20,
    multiplier: 1.0,
    minDistance: 0,
    maxDistance: 15,
  },
  bike: {
    baseFare: 25,
    pricePerKm: 8.0,
    pricePerMinute: 0,
    waitingChargePerMinute: 1.5,
    freeWaitingMinutes: 3,
    platformFee: 12,
    taxRate: 0.05,
    cancellationFee: 25,
    multiplier: 1.0,
    minDistance: 0,
    maxDistance: 25,
  },
  auto: {
    baseFare: 35,
    pricePerKm: 11.5,
    pricePerMinute: 0,
    waitingChargePerMinute: 2.0,
    freeWaitingMinutes: 3,
    platformFee: 12,
    taxRate: 0.05,
    cancellationFee: 35,
    multiplier: 1.0,
    minDistance: 0,
    maxDistance: 35,
  },
  "e-rickshaw": {
    baseFare: 20,
    pricePerKm: 8.0,
    pricePerMinute: 0,
    waitingChargePerMinute: 1.5,
    freeWaitingMinutes: 3,
    platformFee: 10,
    taxRate: 0.05,
    cancellationFee: 20,
    multiplier: 1.0,
    minDistance: 0,
    maxDistance: 20,
  },
  mini: {
    baseFare: 55,
    pricePerKm: 13.5,
    pricePerMinute: 0,
    waitingChargePerMinute: 2.0,
    freeWaitingMinutes: 4,
    platformFee: 15,
    taxRate: 0.05,
    cancellationFee: 45,
    multiplier: 1.0,
    minDistance: 0,
    maxDistance: 100,
  },
  car: {
    baseFare: 75,
    pricePerKm: 16.5,
    pricePerMinute: 0,
    waitingChargePerMinute: 2.5,
    freeWaitingMinutes: 4,
    platformFee: 15,
    taxRate: 0.05,
    cancellationFee: 50,
    multiplier: 1.0,
    minDistance: 0,
    maxDistance: 150,
  },
  priority: {
    baseFare: 110,
    pricePerKm: 21.0,
    pricePerMinute: 0,
    waitingChargePerMinute: 3.0,
    freeWaitingMinutes: 5,
    platformFee: 20,
    taxRate: 0.05,
    cancellationFee: 75,
    multiplier: 1.0,
    minDistance: 0,
    maxDistance: 200,
  },
  loading: {
    baseFare: 110,
    pricePerKm: 20.0,
    pricePerMinute: 0,
    waitingChargePerMinute: 3.5,
    freeWaitingMinutes: 5,
    platformFee: 20,
    taxRate: 0.05,
    cancellationFee: 75,
    multiplier: 1.0,
    minDistance: 0,
    maxDistance: 250,
  },
  truck: {
    baseFare: 160,
    pricePerKm: 26.0,
    pricePerMinute: 0,
    waitingChargePerMinute: 5.0,
    freeWaitingMinutes: 10,
    platformFee: 30,
    taxRate: 0.05,
    cancellationFee: 100,
    multiplier: 1.0,
    minDistance: 0,
    maxDistance: 500,
  },
  intercity: {
    baseFare: 250,
    pricePerKm: 14.0,
    pricePerMinute: 0,
    waitingChargePerMinute: 2.5,
    freeWaitingMinutes: 10,
    platformFee: 25,
    taxRate: 0.05,
    cancellationFee: 100,
    multiplier: 1.0,
    minDistance: 25,
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
  monthlyDiscountCap?: number;
  maxMonthlyRides?: number;
  remainingMonthlyAllowance?: number;
  remainingMonthlyRides?: number;
}

export const DEFAULT_STUDENT_CONFIG: Required<StudentProgramEconomics> = {
  discountPercentage: 10,
  maxDiscountCap: 50,
  minFare: 100,
  eligibleVehicleTypes: ["bike", "auto", "e-rickshaw", "car"],
  allowStackingWithPromo: false,
  monthlyDiscountCap: 200,
  maxMonthlyRides: 10,
  remainingMonthlyAllowance: 200,
  remainingMonthlyRides: 10,
};

const toPaise = (amount: number): number =>
  Number.isFinite(amount) && amount >= 0 ? Math.round((amount + Number.EPSILON) * 100) : 0;
const fromPaise = (paise: number): number => paise / 100;
const roundWholeRupees = (paise: number): number => Math.round(paise / 100) * 100;

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
  studentSettings?: StudentProgramEconomics,
  cancellationDues: number = 0
): IFareBreakdown {
  let vType = (vehicleType || "car").toLowerCase();
  if (vType === "toto" || vType === "erickshaw" || vType === "e_rickshaw") { vType = "e-rickshaw"; }
  const defaultRate = DEFAULT_VEHICLE_RATES[vType] || DEFAULT_VEHICLE_RATES.car;
  const customRate = customRates?.[vType];
  const cfg: VehicleRateConfig = {
    ...defaultRate,
    ...(customRate || {}),
  };

  const baseFarePaise = toPaise(cfg.baseFare);
  const pricePerKmPaise = toPaise(cfg.pricePerKm);
  const platformFeePaise = toPaise(cfg.platformFee ?? 15);
  const taxRate = cfg.taxRate ?? 0.05;
  const cancellationFee = fromPaise(toPaise(cfg.cancellationFee ?? 50));
  const tenthsKm = Number.isFinite(distanceKm) ? Math.max(0, Math.round(distanceKm * 10)) : 0;
  const distKm = tenthsKm / 10;
  const distanceFarePaise = roundWholeRupees((tenthsKm * pricePerKmPaise) / 10);

  // Time estimate: Informational ETA only, NEVER factored into fare calculation
  const timeMinutes = Math.max(3, Math.round((distKm / 25) * 60));

  // Waiting charge calculation
  let waitingMinutes = 0;
  let waitingCharge = 0;
  if (waitingDetails?.arrivedAt && waitingDetails?.startedAt) {
    const waitResult = calculateWaitingFee(
      waitingDetails.arrivedAt,
      waitingDetails.startedAt,
      cfg.waitingChargePerMinute ?? 2.5,
      cfg.freeWaitingMinutes ?? 3
    );
    waitingMinutes = waitResult.waitingMinutes;
    waitingCharge = waitResult.waitingCharge;
  }

  const surgeMultiplier = overrideSurge ?? cfg.multiplier ?? 1;
  const rawSubtotal = baseFarePaise + distanceFarePaise;
  const surgeAmountPaise = roundWholeRupees(rawSubtotal * (surgeMultiplier - 1));
  const subtotalWithSurge = Math.max(0, rawSubtotal + surgeAmountPaise + toPaise(waitingCharge));
  const taxesPaise = roundWholeRupees((subtotalWithSurge + platformFeePaise) * taxRate);
  const totalBeforeDiscount = subtotalWithSurge + platformFeePaise + taxesPaise;

  const stuCfg = { ...DEFAULT_STUDENT_CONFIG, ...studentSettings };
  const isVehicleEligible = stuCfg.eligibleVehicleTypes.some((type) => type.toLowerCase() === vType);
  const promoAllowed = Math.min(totalBeforeDiscount, toPaise(discountAmount));
  const studentAllowed = isStudent && isVehicleEligible && subtotalWithSurge >= toPaise(stuCfg.minFare) &&
    stuCfg.remainingMonthlyRides > 0 && stuCfg.remainingMonthlyAllowance > 0
    ? Math.min(
        roundWholeRupees(subtotalWithSurge * stuCfg.discountPercentage / 100),
        toPaise(stuCfg.maxDiscountCap),
        toPaise(stuCfg.remainingMonthlyAllowance),
        totalBeforeDiscount,
      )
    : 0;

  // Give the rider the better discount unless the configured promotion explicitly permits stacking.
  let promoDiscountPaise = 0;
  let studentDiscountPaise = 0;
  if (stuCfg.allowStackingWithPromo || promoAllowed >= studentAllowed) promoDiscountPaise = promoAllowed;
  if (stuCfg.allowStackingWithPromo || studentAllowed > promoAllowed) {
    studentDiscountPaise = Math.min(studentAllowed, totalBeforeDiscount - promoDiscountPaise);
  }

  const discountPaise = promoDiscountPaise + studentDiscountPaise;
  const rideFarePaise = totalBeforeDiscount - discountPaise;
  const roundedRideFarePaise = roundWholeRupees(rideFarePaise);
  const duesPaise = roundWholeRupees(toPaise(cancellationDues));

  return {
    vehicleType: vType,
    baseFare: fromPaise(baseFarePaise),
    distanceKm: distKm,
    pricePerKm: fromPaise(pricePerKmPaise),
    distanceFare: fromPaise(distanceFarePaise),
    timeMinutes,
    pricePerMinute: 0,
    timeFare: 0,
    waitingMinutes,
    waitingCharge,
    platformFee: fromPaise(platformFeePaise),
    surgeMultiplier,
    surgeAmount: fromPaise(surgeAmountPaise),
    taxes: fromPaise(taxesPaise),
    taxRate,
    discount: fromPaise(discountPaise),
    promoDiscount: fromPaise(promoDiscountPaise),
    isStudentDiscountApplied: studentDiscountPaise > 0,
    studentDiscount: fromPaise(studentDiscountPaise),
    totalFare: fromPaise(roundedRideFarePaise + duesPaise),
    roundingAdjustment: fromPaise(roundedRideFarePaise - rideFarePaise),
    cancellationFee,
    cancellationDues: fromPaise(duesPaise),
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
