import { describe, it, expect } from "vitest";
import {
  recommendVehicle,
  isVehicleDistanceEligible,
  SmartRecommendationCriteria,
} from "@/lib/vehicleConfig";

describe("recommendVehicle - Distance and Capacity Awareness", () => {
  it("recommends bike for solo budget rider under 15 km", () => {
    const rec = recommendVehicle({
      passengers: 1,
      luggage: "none",
      preference: "budget",
      distanceKm: 8,
    });
    expect(rec.vehicleId).toBe("bike");
    expect(isVehicleDistanceEligible("bike", 8)).toBe(true);
  });

  it("cascades from bike to auto when solo budget ride exceeds 15 km but is <= 30 km", () => {
    const rec = recommendVehicle({
      passengers: 1,
      luggage: "none",
      preference: "budget",
      distanceKm: 22,
    });
    expect(rec.vehicleId).toBe("auto");
    expect(rec.reason).toContain("longer solo ride");
    expect(isVehicleDistanceEligible("auto", 22)).toBe(true);
  });

  it("cascades from bike/auto to mini when solo budget ride exceeds 30 km", () => {
    const rec = recommendVehicle({
      passengers: 1,
      luggage: "none",
      preference: "budget",
      distanceKm: 45,
    });
    expect(rec.vehicleId).toBe("mini");
    expect(rec.reason).toContain(">30km");
    expect(isVehicleDistanceEligible("mini", 45)).toBe(true);
  });

  it("cascades 2-passenger budget ride to mini when route exceeds 30 km auto limit", () => {
    const rec = recommendVehicle({
      passengers: 2,
      luggage: "none",
      preference: "budget",
      distanceKm: 35,
    });
    expect(rec.vehicleId).toBe("mini");
    expect(rec.reason).toContain("longer route");
  });

  it("recommends auto for 2 passengers budget within 30 km", () => {
    const rec = recommendVehicle({
      passengers: 2,
      luggage: "none",
      preference: "budget",
      distanceKm: 12,
    });
    expect(rec.vehicleId).toBe("auto");
  });

  it("recommends priority for large groups of 5 or 6", () => {
    const rec = recommendVehicle({
      passengers: 6,
      luggage: "large",
      preference: "comfort",
      distanceKm: 20,
    });
    expect(rec.vehicleId).toBe("priority");
  });

  it("upgrades goods transport to truck when distance exceeds loading limit (>250 km)", () => {
    const rec = recommendVehicle({
      passengers: 1,
      luggage: "none",
      preference: "budget",
      isGoods: true,
      cargoWeightKg: 200,
      distanceKm: 300,
    });
    expect(rec.vehicleId).toBe("truck");
    expect(rec.reason).toContain(">250km");
  });

  it("correctly identifies distance eligibility limits", () => {
    expect(isVehicleDistanceEligible("bike", 25)).toBe(true);
    expect(isVehicleDistanceEligible("bike", 25.1)).toBe(false);
    expect(isVehicleDistanceEligible("auto", 35)).toBe(true);
    expect(isVehicleDistanceEligible("auto", 35.1)).toBe(false);
    expect(isVehicleDistanceEligible("mini", 400)).toBe(false);
    expect(isVehicleDistanceEligible("loading", 250)).toBe(true);
    expect(isVehicleDistanceEligible("loading", 251)).toBe(false);
  });
});
