// Travel verification codes and bearer-style tracking links belong to the rider.
const riderOnlyField = /^(?:pickupOtp|dropOtp|shareToken)/i;

export const driverBookingProjection =
  "-pickupOtp -pickupOtpExpires -pickupOtpFailedAttempts -pickupOtpLockedUntil " +
  "-dropOtp -dropOtpExpires -dropOtpFailedAttempts -dropOtpLockedUntil " +
  "-dropOtpBypassed -dropOtpBypassReason -shareToken -shareTokenExpiresAt";

export const dispatchOfferProjection =
  "_id pickupAddress dropAddress fare partnerAmount createdAt estimatedDropoffTime " +
  "tripDurationMinutes driverPreference status isScheduled scheduledPickupTime serviceMode";

export function withoutRiderSecrets<T extends object>(
  booking: T | null | undefined,
) {
  if (!booking) return booking;
  const record = typeof (booking as { toObject?: unknown }).toObject === "function"
    ? (booking as { toObject: () => object }).toObject()
    : booking;
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !riderOnlyField.test(key)),
  );
}
