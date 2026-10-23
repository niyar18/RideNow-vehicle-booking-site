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

/**
 * Public observers share a booking room with the rider and driver. Only these
 * explicitly approved fields/events may cross that boundary.
 */
export function sanitizePublicTrackingEvent(event, data, bookingId) {
  if (!data || typeof data !== "object") return null;

  if (event === "driver-location") {
    const latitude = data.latitude;
    const longitude = data.longitude;
    if (typeof latitude !== "number" || typeof longitude !== "number") return null;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return {
      bookingId: String(bookingId),
      latitude,
      longitude,
      ...(typeof data.status === "string" ? { status: data.status } : {}),
      ...(typeof data.timestamp === "string" || typeof data.timestamp === "number"
        ? { timestamp: data.timestamp }
        : {}),
    };
  }

  if (event === "booking-updated") {
    const safe = { bookingId: String(bookingId) };
    for (const key of [
      "status",
      "startedAt",
      "estimatedDropoffTime",
      "tripDurationMinutes",
      "completedAt",
      "actualDropoffTime",
      "isPanicActive",
      "safetyStatus",
    ]) {
      if (Object.prototype.hasOwnProperty.call(data, key)) safe[key] = data[key];
    }
    return safe;
  }

  // Public tracking links are read-only and must not receive chat, call,
  // OTP, payment, or other participant-only room events.
  return null;
}
