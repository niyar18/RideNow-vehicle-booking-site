import { isTerminalBookingStatus } from "./trackingSecurity.js";

const DISPATCH_EVENTS = new Set(["new-booking", "new-scheduled-booking"]);
const GPS_EVENTS = new Set(["driver-location-update", "driver-live-location", "update-location"]);
const OFFER_FIELDS = [
  "pickupAddress", "dropAddress", "fare", "partnerAmount", "createdAt",
  "estimatedDropoffTime", "tripDurationMinutes", "driverPreference",
  "status", "isScheduled", "scheduledPickupTime", "serviceMode",
];

export function isDispatchOffer(event) {
  return DISPATCH_EVENTS.has(event);
}

export function isTripParticipant(booking, userId, role) {
  if (!booking || !userId) return false;
  const id = String(userId);
  return String(booking.user ?? "") === id ||
    String(booking.driver ?? "") === id || role === "admin";
}

export function toDispatchOffer(data) {
  const id = data?._id ?? data?.bookingId;
  if (typeof id !== "string" || !id) return null;
  const offer = { _id: id };
  for (const key of OFFER_FIELDS) {
    const value = data[key];
    if (typeof value === "string" || typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value))) {
      offer[key] = value;
    }
  }
  return offer;
}

const riderField = /^(?:pickupOtp|dropOtp|shareToken)/i;
export function stripRiderFields(value) {
  if (Array.isArray(value)) return value.map(stripRiderFields);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !riderField.test(key))
      .map(([key, field]) => [key, stripRiderFields(field)])
  );
}

export function hasRiderFields(value) {
  return !!value && typeof value === "object" &&
    Object.entries(value).some(([key, field]) => riderField.test(key) || hasRiderFields(field));
}

export function directRidePayload(event, data, booking, recipient) {
  if (isDispatchOffer(event)) return toDispatchOffer(data);
  if (!hasRiderFields(data)) return data;
  if (recipient && booking?.user && String(booking.user) === String(recipient)) return data;
  return stripRiderFields(data);
}

export function createSocketRateLimiter(now = Date.now) {
  const counts = new Map();
  return {
    allows(socketId, event) {
      const currentTime = now();
      let entry = counts.get(socketId);
      if (!entry) {
        entry = { count: 0, resetTime: currentTime + 1000, lastGpsTime: -Infinity };
        counts.set(socketId, entry);
      }
      if (currentTime >= entry.resetTime) {
        entry.count = 0;
        entry.resetTime = currentTime + 1000;
      }
      if (entry.count >= 35) return false;
      entry.count += 1;
      if (GPS_EVENTS.has(event)) {
        if (currentTime - entry.lastGpsTime < 600) return false;
        entry.lastGpsTime = currentTime;
      }
      return true;
    },
    delete(socketId) {
      counts.delete(socketId);
    },
  };
}

export function installSocketRateLimit(socket, limiter) {
  socket.use(([event], next) => {
    if (!limiter.allows(socket.id, event)) {
      socket.emit("rate-limit-warning", {
        message: "Too many messages sent. Please slow down.",
        event,
      });
      return;
    }
    next();
  });
}

export function installLiveGpsHandler(socket, {
  canonicalBookingId, findBooking, publish, revokeObservers, now = Date.now,
}) {
  socket.on("driver-location-update", async (data) => {
    const bookingId = canonicalBookingId(data?.bookingId);
    if (!socket.userId || !bookingId) return;
    const coordinate = (value) => {
      if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return NaN;
      return Number(value);
    };
    const latitude = coordinate(data.latitude);
    const longitude = coordinate(data.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;

    try {
      const booking = await findBooking(bookingId);
      if (!booking || String(booking.driver ?? "") !== String(socket.userId)) return;
      if (isTerminalBookingStatus(booking.status)) {
        await revokeObservers(bookingId);
        return;
      }
      await publish(bookingId, "driver-location", {
        bookingId,
        latitude,
        longitude,
        status: booking.status || "arriving",
        timestamp: now(),
      }, null, booking);
    } catch (err) {
      console.error("[SocketSecurity] driver-location-update error:", err);
    }
  });
}
