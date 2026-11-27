import { describe, expect, it } from "vitest";
import { dispatchOfferProjection, driverBookingProjection, withoutRiderSecrets } from "../bookingPrivacy";

describe("booking privacy contracts", () => {
  it("serializes a booking document without rider-only verification or tracking data", () => {
    const record = {
      status: "started", pickupOtp: "fixture", dropOtp: "fixture",
      shareToken: "fixture", shareTokenExpiresAt: new Date(),
    };
    expect(withoutRiderSecrets({ toObject: () => record })).toEqual({ status: "started" });
    expect(record.shareToken).toBe("fixture");
  });

  it("keeps the pending offer small and excludes rider secrets from driver trip reads", () => {
    expect(dispatchOfferProjection.split(" ")).toContain("pickupAddress");
    expect(dispatchOfferProjection.split(" ")).not.toContain("user");
    for (const key of ["pickupOtp", "dropOtp", "shareToken"]) {
      expect(dispatchOfferProjection.split(" ")).not.toContain(key);
      expect(driverBookingProjection.split(" ")).toContain(`-${key}`);
    }
  });
});
