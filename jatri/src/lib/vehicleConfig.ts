import { isFareDistanceEligible, pricingVehicleForChoice, type FareRateTable } from "./farePolicy";

export type VehicleType = "scooty" | "bike" | "auto" | "e-rickshaw" | "mini" | "car" | "priority" | "loading" | "truck";
export type ServiceMode = "passenger" | "logistics";

export interface VehicleOption {
  id: VehicleType;
  label: string;
  categoryTitle: string;
  serviceMode: ServiceMode;
  tagline: string;
  description: string;
  passengerCapacity?: number;
  maxWeightKg?: number;
  etaText: string;
  features: string[];
  recommendedFor: string;
}

/**
 * Authoritative vehicle options catalog with distinctive Jaatri naming.
 */
export const VEHICLE_OPTIONS: Record<VehicleType, VehicleOption> = {
  scooty: {
    id: "scooty",
    label: "Jaatri Scooty",
    categoryTitle: "Jaatri Scooty — Quick Light Commute",
    serviceMode: "passenger",
    tagline: "Solo commute · Quick & light",
    description: "Affordable solo scooty ride for quick nearby commutes.",
    passengerCapacity: 1,
    etaText: "2–3 min",
    features: ["Helmet provided", "Easy hop-on", "Economical"],
    recommendedFor: "Solo passengers with light luggage",
  },
  bike: {
    id: "bike",
    label: "Jaatri Moto",
    categoryTitle: "Jaatri Moto — Solo Ride",
    serviceMode: "passenger",
    tagline: "Quick solo ride · Helmet provided",
    description: "Fast motorcycle commuting for solo riders to bypass traffic.",
    passengerCapacity: 1,
    etaText: "2–3 min",
    features: ["Helmet provided", "Traffic bypass", "Affordable"],
    recommendedFor: "Solo commuters to beat traffic",
  },
  auto: {
    id: "auto",
    label: "Jaatri Auto",
    categoryTitle: "Jaatri Auto — 3-Wheeler",
    serviceMode: "passenger",
    tagline: "Everyday doorstep auto rides",
    description: "Iconic 3-wheeler ride for daily errands and small groups.",
    passengerCapacity: 3,
    etaText: "3–4 min",
    features: ["Doorstep pickup", "Comfortable 3-seater", "Meter rates"],
    recommendedFor: "2 to 3 passengers traveling short-to-medium distances",
  },
  "e-rickshaw": {
    id: "e-rickshaw",
    label: "Jaatri Toto",
    categoryTitle: "Jaatri Toto — E-Rickshaw",
    serviceMode: "passenger",
    tagline: "Eco-friendly electric 3-wheeler",
    description: "Silent, zero-emission electric rickshaw for short city hops.",
    passengerCapacity: 3,
    etaText: "3-5 min",
    features: ["Zero emissions", "Quiet & smooth", "Budget-friendly"],
    recommendedFor: "Short city trips with 1 to 3 passengers on eco-friendly rides",
  },
  mini: {
    id: "mini",
    label: "Jaatri Mini",
    categoryTitle: "Jaatri Mini — Economy Hatchback",
    serviceMode: "passenger",
    tagline: "Economy AC hatchback",
    description: "Pocket-friendly compact 4-wheeler (WagonR, Tiago) with AC.",
    passengerCapacity: 4,
    etaText: "3–5 min",
    features: ["AC comfort", "Compact & fast", "Affordable cab"],
    recommendedFor: "Up to 4 passengers looking for affordable AC rides",
  },
  car: {
    id: "car",
    label: "Jaatri Premier",
    categoryTitle: "Jaatri Premier — AC Sedan",
    serviceMode: "passenger",
    tagline: "Comfortable AC sedan",
    description: "Spacious executive sedan (Dzire, Amaze) with verified drivers.",
    passengerCapacity: 4,
    etaText: "4–5 min",
    features: ["Chilled AC", "Top verified drivers", "Spacious boot"],
    recommendedFor: "Comfort seekers, families, or airport drops",
  },
  priority: {
    id: "priority",
    label: "Jaatri XL Priority",
    categoryTitle: "Jaatri XL Priority — Spacious SUV",
    serviceMode: "passenger",
    tagline: "Spacious 6-seater SUV · Priority pickup",
    description: "Extra legroom & 6 passenger capacity (Ertiga, Innova) with priority dispatch.",
    passengerCapacity: 6,
    etaText: "3–5 min",
    features: ["6 seats + bags", "Priority dispatch", "Extra spacious"],
    recommendedFor: "Large families, group trips, and excessive luggage",
  },
  loading: {
    id: "loading",
    label: "Jaatri Express Mini",
    categoryTitle: "Jaatri Express — Tata Ace & Dost",
    serviceMode: "logistics",
    tagline: "House shifting, furniture & merchant stock",
    description: "Dedicated transport for cargo, house moves, and merchant deliveries.",
    maxWeightKg: 500,
    etaText: "8–10 min",
    features: ["Payload up to 500 kg", "Tata Ace / Dost verified", "Live GPS cargo tracking"],
    recommendedFor: "Apartment shifting, furniture, electronics & merchant cartons",
  },
  truck: {
    id: "truck",
    label: "Jaatri Freight",
    categoryTitle: "Jaatri Freight — Commercial Logistics",
    serviceMode: "logistics",
    tagline: "Heavy cargo, wholesale stock & industrial freight",
    description: "Heavy logistics vehicle for industrial, agricultural, and wholesale cargo.",
    maxWeightKg: 2000,
    etaText: "12–15 min",
    features: ["Commercial 14ft payload", "Up to 2,000 kg capacity", "E-way bill & GST compliant"],
    recommendedFor: "Heavy machinery, bulk wholesale goods & business consignments",
  },
};

export const PASSENGER_VEHICLES: VehicleOption[] = [
  VEHICLE_OPTIONS.scooty,
  VEHICLE_OPTIONS.bike,
  VEHICLE_OPTIONS.auto,
  VEHICLE_OPTIONS["e-rickshaw"],
  VEHICLE_OPTIONS.mini,
  VEHICLE_OPTIONS.car,
  VEHICLE_OPTIONS.priority,
];

export const LOGISTICS_VEHICLES: VehicleOption[] = [
  VEHICLE_OPTIONS.loading,
  VEHICLE_OPTIONS.truck,
];

export interface SmartRecommendationCriteria {
  passengers: number; // 1, 2, 3, 4, 5, 6
  luggage: "none" | "small" | "large";
  preference: "budget" | "comfort";
  isGoods?: boolean;
  cargoWeightKg?: number;
  distanceKm?: number;
}

export interface RecommendationResult {
  vehicleId: VehicleType;
  matchScore: number;
  reason: string;
}

/**
 * Checks whether a vehicle type is eligible for a given journey road distance.
 */
export function isVehicleDistanceEligible(vehicleId: VehicleType, distanceKm?: number, rates?: FareRateTable): boolean {
  if (distanceKm === undefined || distanceKm === 0) return true;
  return isFareDistanceEligible(pricingVehicleForChoice(vehicleId, distanceKm), distanceKm, rates);
}

/** Keep recommendation preferences, but never prefer a vehicle outside the current tariff or capacity. */
export function pickAvailableRecommendation(
  recommendation: RecommendationResult,
  options: { passengers: number; isGoods: boolean; cargoWeightKg: number; isAvailable: (id: VehicleType) => boolean },
): RecommendationResult {
  if (options.isAvailable(recommendation.vehicleId)) return recommendation;
  const alternatives = options.isGoods ? LOGISTICS_VEHICLES : PASSENGER_VEHICLES;
  const alternative = alternatives.find((v) => options.isAvailable(v.id) &&
    (options.isGoods ? (v.maxWeightKg ?? 0) >= options.cargoWeightKg : (v.passengerCapacity ?? 0) >= options.passengers));
  return alternative
    ? { vehicleId: alternative.id, matchScore: 90, reason: "Fits your party or payload and serves this route at the current rates." }
    : recommendation;
}

/**
 * Deterministic Smart Vehicle Matching Engine.
 * Recommends the optimal vehicle option based on passenger count,
 * luggage volume, comfort preferences, cargo weight, and route distance.
 */
export function recommendVehicle(criteria: SmartRecommendationCriteria): RecommendationResult {
  const { passengers, luggage, preference, isGoods, cargoWeightKg = 0, distanceKm } = criteria;

  if (isGoods) {
    if (cargoWeightKg > 500 || (typeof distanceKm === "number" && distanceKm > 250)) {
      return {
        vehicleId: "truck",
        matchScore: 96,
        reason:
          typeof distanceKm === "number" && distanceKm > 250
            ? "For this long freight route (>250km), choose Jaatri Freight"
            : "Heavy commercial cargo (>500kg) requires Jaatri Freight 14ft payload",
      };
    }
    return {
      vehicleId: "loading",
      matchScore: 94,
      reason: "Optimal for cartons, furniture & merchant stock under 500kg",
    };
  }

  // 1. Large group (5 or 6 passengers)
  if (passengers >= 5) {
    return {
      vehicleId: "priority",
      matchScore: 98,
      reason: `Jaatri XL Priority comfortably seats ${passengers} passengers with 3 rows of seating & bags`,
    };
  }

  // 2. 4 passengers
  if (passengers === 4) {
    if (preference === "comfort" || luggage === "large") {
      return {
        vehicleId: "car",
        matchScore: 96,
        reason: "Jaatri Premier executive sedan offers spacious boot and top AC comfort for 4 passengers",
      };
    }
    return {
      vehicleId: "mini",
      matchScore: 94,
      reason: "Jaatri Mini offers affordable 4-passenger AC hatchback travel",
    };
  }

  // 3. 2 to 3 passengers
  if (passengers >= 2) {
    if (luggage === "large") {
      if (preference === "comfort") {
        return {
          vehicleId: "car",
          matchScore: 93,
          reason: "Jaatri Premier provides a full sedan boot for large bags with chilled AC",
        };
      }
      return {
        vehicleId: "mini",
        matchScore: 91,
        reason: "Jaatri Mini hatchback fits bags with comfortable AC at lower fare",
      };
    }

    if (preference === "comfort") {
      return {
        vehicleId: "car",
        matchScore: 92,
        reason: "Jaatri Premier executive sedan gives premium comfort & quiet cabin",
      };
    }

    // Budget priority: check auto 30km distance limit
    if (typeof distanceKm === "number" && distanceKm > 30) {
      return {
        vehicleId: "mini",
        matchScore: 92,
        reason: "For this longer route, Jaatri Mini offers affordable AC travel",
      };
    }

    return {
      vehicleId: "auto",
      matchScore: 96,
      reason: `Jaatri Auto is the most budget-friendly doorstep ride for ${passengers} passengers`,
    };
  }

  // 4. Solo passenger (passengers === 1)
  if (luggage === "large") {
    return {
      vehicleId: "car",
      matchScore: 92,
      reason: "Large luggage requires Jaatri Premier dedicated sedan boot space",
    };
  }

  if (preference === "comfort") {
    return {
      vehicleId: "mini",
      matchScore: 90,
      reason: "Jaatri Mini gives you personal AC comfort at our lowest 4-wheeler cab fare",
    };
  }

  if (luggage === "small") {
    if (typeof distanceKm === "number" && distanceKm > 30) {
      return {
        vehicleId: "mini",
        matchScore: 91,
        reason: "Route distance exceeds 30km auto limit; Jaatri Mini fits your bag with affordable AC comfort",
      };
    }
    return {
      vehicleId: "auto",
      matchScore: 92,
      reason: "Jaatri Auto has ample floor space for your bag at an economical fare",
    };
  }

  // Default solo + budget + no luggage: check distance limits
  if (typeof distanceKm === "number" && distanceKm > 30) {
    return {
      vehicleId: "mini",
      matchScore: 92,
      reason: "Longer journey (>30km); Jaatri Mini is an economical AC choice",
    };
  }

  if (typeof distanceKm === "number" && distanceKm > 15) {
    return {
      vehicleId: "auto",
      matchScore: 94,
      reason: "Jaatri Auto offers more room for this longer solo ride",
    };
  }

  return {
    vehicleId: "bike",
    matchScore: 99,
    reason: "Jaatri Moto is fastest and most economical for solo commuting to bypass traffic",
  };
}
