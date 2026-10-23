import test from "node:test";
import assert from "node:assert/strict";
import {
  getTrackingExpiry,
  isTerminalBookingStatus,
  isTrackingTokenExpired,
  sanitizePublicTrackingEvent,
} from "../trackingSecurity.js";

const HOUR = 60 * 60 * 1000;

test("terminal ride statuses are recognized case-insensitively", () => {
  for (const status of ["completed", "cancelled", "rejected", "expired", "payment_failed", "no_drivers_available", "disputed"]) {
    assert.equal(isTerminalBookingStatus(status), true, status);
    assert.equal(isTerminalBookingStatus(status.toUpperCase()), true, status.toUpperCase());
  }
  for (const status of ["requested", "confirmed", "started", "scheduled", "auto_rematching"]) {
    assert.equal(isTerminalBookingStatus(status), false, status);
  }
});

test("explicit token expiry takes precedence over legacy fallback", () => {
  const expiry = Date.parse("2026-10-24T12:00:00.000Z");
  const booking = {
    shareTokenExpiresAt: new Date(expiry),
    createdAt: new Date("2026-10-20T12:00:00.000Z"),
  };
  assert.equal(getTrackingExpiry(booking), expiry);
  assert.equal(isTrackingTokenExpired(booking, expiry - 1), false);
  assert.equal(isTrackingTokenExpired(booking, expiry), true);
});

test("legacy instant bookings expire 24 hours after creation", () => {
  const createdAt = Date.parse("2026-10-23T12:00:00.000Z");
  const booking = { createdAt: new Date(createdAt), isScheduled: false };
  assert.equal(getTrackingExpiry(booking), createdAt + 24 * HOUR);
  assert.equal(isTrackingTokenExpired(booking, createdAt + 24 * HOUR), true);
});

test("legacy scheduled bookings expire 12 hours after scheduled pickup", () => {
  const scheduledPickupTime = Date.parse("2026-10-25T12:00:00.000Z");
  const booking = {
    createdAt: new Date("2026-10-23T12:00:00.000Z"),
    isScheduled: true,
    scheduledPickupTime: new Date(scheduledPickupTime),
  };
  assert.equal(getTrackingExpiry(booking), scheduledPickupTime + 12 * HOUR);
  assert.equal(isTrackingTokenExpired(booking, scheduledPickupTime + 11 * HOUR), false);
  assert.equal(isTrackingTokenExpired(booking, scheduledPickupTime + 12 * HOUR), true);
});

test("records without a trustworthy expiry timestamp are treated as expired", () => {
  assert.equal(getTrackingExpiry({}), 0);
  assert.equal(isTrackingTokenExpired({ createdAt: "not-a-date" }, Date.now()), true);
});

test("public tracking receives only allowlisted booking status fields", () => {
  const payload = sanitizePublicTrackingEvent("booking-updated", {
    bookingId: "booking-id",
    status: "started",
    isPanicActive: true,
    pickupOtp: "1234",
    dropOtp: "9876",
    fare: 850,
    paymentStatus: "paid",
    userMobileNumber: "9999999999",
    driverMobileNumber: "8888888888",
  }, "507f1f77bcf86cd799439011");

  assert.deepEqual(payload, {
    bookingId: "507f1f77bcf86cd799439011",
    status: "started",
    isPanicActive: true,
  });
});

test("public tracking receives only validated GPS coordinates", () => {
  assert.deepEqual(
    sanitizePublicTrackingEvent("driver-location", {
      latitude: 26.2,
      longitude: 91.7,
      status: "arriving",
      dropOtp: "1234",
      phone: "9999999999",
    }, "507f1f77bcf86cd799439011"),
    {
      bookingId: "507f1f77bcf86cd799439011",
      latitude: 26.2,
      longitude: 91.7,
      status: "arriving",
    }
  );
  assert.equal(
    sanitizePublicTrackingEvent("driver-location", { latitude: 95, longitude: 91 }, "id"),
    null
  );
});

test("public tracking never receives participant-only room events", () => {
  for (const event of ["chat-message", "incoming-call", "call-accepted", "call-rejected", "call-ended", "private-event"]) {
    assert.equal(
      sanitizePublicTrackingEvent(event, { bookingId: "507f1f77bcf86cd799439011", message: "secret" }, "507f1f77bcf86cd799439011"),
      null,
      event
    );
  }
});

test("public booking updates reject nested or invalid field values", () => {
  const payload = sanitizePublicTrackingEvent("booking-updated", {
    status: { value: "started", pickupOtp: "1234" },
    startedAt: { secret: "private" },
    estimatedDropoffTime: "2026-10-23T20:00:00.000Z",
    tripDurationMinutes: Number.POSITIVE_INFINITY,
    isPanicActive: "true",
    safetyStatus: { phone: "9999999999" },
    fare: 850,
  }, "507f1f77bcf86cd799439011");

  assert.deepEqual(payload, {
    bookingId: "507f1f77bcf86cd799439011",
    estimatedDropoffTime: "2026-10-23T20:00:00.000Z",
  });
});

