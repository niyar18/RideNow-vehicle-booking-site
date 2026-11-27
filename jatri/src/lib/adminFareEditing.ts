import { DEFAULT_VEHICLE_RATES, type VehicleRateConfig } from "./fareEngine";
import { fareDistanceLimits, normalizeFareVehicle } from "./farePolicy";

export const adminFareFields = {
  baseFare: { label: "Base fare (₹)", min: 0, max: 100000, step: "0.01" },
  pricePerKm: { label: "Distance rate (₹/km)", min: 0, max: 10000, step: "0.01" },
  platformFee: { label: "Platform fee (₹)", min: 0, max: 100000, step: "0.01" },
  taxRate: { label: "Tax rate (0.05 = 5%)", min: 0, max: 1, step: "0.0001" },
  multiplier: { label: "Fare multiplier", min: 0.01, max: 10, step: "0.01" },
  minDistance: { label: "Minimum distance (km)", min: 0, max: 9999, step: "0.1" },
  maxDistance: { label: "Maximum distance (km)", min: 0.1, max: 9999, step: "0.1" },
} as const;

export type AdminFareField = keyof typeof adminFareFields;
export type AdminFareRow = VehicleRateConfig & { vehicleType: string; version: string | null };

export function validateAdminFareChange(input: unknown, current?: VehicleRateConfig) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Enter a valid fare change.");
  const { vehicleType, version, reason: rawReason, changes } = input as Record<string, unknown>;
  const vehicle = normalizeFareVehicle(vehicleType);
  if (!Object.hasOwn(DEFAULT_VEHICLE_RATES, vehicle)) throw new Error("Choose a supported vehicle class.");
  if (version !== null && (typeof version !== "string" || !Number.isFinite(Date.parse(version)))) throw new Error("Reload the current rates before making changes.");
  const reason = typeof rawReason === "string" ? rawReason.trim() : "";
  if (reason.length < 8 || reason.length > 240) throw new Error("Enter a reason of 8 to 240 characters.");
  if (!changes || typeof changes !== "object" || Array.isArray(changes) || !Object.keys(changes).length) throw new Error("Change at least one field.");
  const patch: Partial<Record<AdminFareField, number>> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (!Object.hasOwn(adminFareFields, key)) throw new Error("This field is not editable.");
    const field = key as AdminFareField;
    const { min, max } = adminFareFields[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
      throw new Error(`${adminFareFields[field].label} must be between ${min} and ${max}.`);
    }
    patch[field] = value;
  }
  const rate = { ...(current ?? DEFAULT_VEHICLE_RATES[vehicle]), ...patch };
  const limits = fareDistanceLimits(vehicle, { [vehicle]: rate });
  if (!limits || limits.min > limits.max) throw new Error("Minimum distance exceeds the effective maximum for this class.");
  return { vehicle, version: version as string | null, patch, reason, rate };
}
