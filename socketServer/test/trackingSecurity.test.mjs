import test from "node:test";
import assert from "node:assert/strict";
import {
  getTrackingExpiry,
  isTerminalBookingStatus,
  isTrackingTokenExpired,
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
