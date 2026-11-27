import { DEFAULT_VEHICLE_RATES, type IFareBreakdown, type VehicleRateConfig } from "./fareEngine";

export type FareRateTable = Record<string, VehicleRateConfig>;
export const LOCAL_FLEET_LIMIT_KM = 100;
const LOCAL = new Set(["scooty", "bike", "auto", "e-rickshaw", "mini", "car", "priority"]);

export const normalizeFareVehicle = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const key = value.trim().toLowerCase();
  return ["toto", "erickshaw", "e_rickshaw"].includes(key) ? "e-rickshaw" : key;
};

export function mergeFareRates(rows: ReadonlyArray<Record<string, unknown>> = []): FareRateTable {
  const merged = Object.fromEntries(Object.entries(DEFAULT_VEHICLE_RATES).map(([key, rate]) => [key, { ...rate }]));
  for (const row of rows) {
    const key = normalizeFareVehicle(row.vehicleType);
    if (!Object.hasOwn(DEFAULT_VEHICLE_RATES, key)) continue;
    const rate = { ...merged[key] };
    for (const field of Object.keys(rate) as (keyof VehicleRateConfig)[]) {
      const value = row[field];
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) continue;
      if (field === "taxRate" && value > 1) continue;
      if (field === "multiplier" && value <= 0) continue;
      rate[field] = value;
    }
    if (rate.minDistance <= rate.maxDistance) merged[key] = rate;
  }
  return merged;
}

/** The existing car choice becomes an explicitly priced intercity class on an outstation route. */
export function pricingVehicleForChoice(vehicle: string, distanceKm: number): string {
  const key = normalizeFareVehicle(vehicle);
  return key === "car" && distanceKm > LOCAL_FLEET_LIMIT_KM ? "intercity" : key;
}

export function fareDistanceLimits(vehicle: string, rates: FareRateTable | null = null) {
  const key = normalizeFareVehicle(vehicle);
  if (!Object.hasOwn(DEFAULT_VEHICLE_RATES, key)) return null;
  const cfg = rates?.[key] ?? DEFAULT_VEHICLE_RATES[key];
  return {
    min: cfg.minDistance,
    max: LOCAL.has(key) ? Math.min(cfg.maxDistance, LOCAL_FLEET_LIMIT_KM) : cfg.maxDistance,
  };
}

export function isFareDistanceEligible(vehicle: string, distanceKm: number, rates?: FareRateTable | null): boolean {
  const limits = fareDistanceLimits(vehicle, rates);
  return limits !== null && Number.isFinite(distanceKm) && distanceKm >= limits.min && distanceKm <= limits.max;
}

export interface BookingFareQuote {
  breakdown: IFareBreakdown;
  durationMinutes: number;
  estimatedRoute: boolean;
}
