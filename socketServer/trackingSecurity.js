export const TERMINAL_BOOKING_STATUSES = new Set([
  "completed",
  "cancelled",
  "rejected",
  "expired",
  "payment_failed",
  "no_drivers_available",
  "disputed",
]);

export function isTerminalBookingStatus(status) {
  return TERMINAL_BOOKING_STATUSES.has(String(status || "").toLowerCase());
}

export function getTrackingExpiry(booking) {
  const explicitExpiry = booking?.shareTokenExpiresAt
    ? new Date(booking.shareTokenExpiresAt).getTime()
    : NaN;
  if (Number.isFinite(explicitExpiry)) return explicitExpiry;

  // Backward-compatible expiry for records created before shareTokenExpiresAt existed.
  const scheduled = Boolean(booking?.isScheduled && booking?.scheduledPickupTime);
  const referenceTime = scheduled
    ? new Date(booking.scheduledPickupTime).getTime()
    : new Date(booking?.createdAt).getTime();
  if (!Number.isFinite(referenceTime)) return 0;
  return referenceTime + (scheduled ? 12 : 24) * 60 * 60 * 1000;
}

export function isTrackingTokenExpired(booking, now = Date.now()) {
  return getTrackingExpiry(booking) <= now;
}
