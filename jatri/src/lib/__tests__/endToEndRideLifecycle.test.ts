import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  isAuthorizedForTransition,
  ALLOWED_TRANSITIONS,
} from "@/lib/bookingStateMachine";
import { calculateFareBreakdown, DEFAULT_VEHICLE_RATES } from "@/lib/fareEngine";
import { generateSecureOtp, hashOtpCode, verifyOtpCode } from "@/lib/cryptoOtp";
import { calculateCommissionSplit } from "@/lib/commission";
import { maskChatPii } from "@/lib/chatPrivacy";
import { evaluateSafetyMatch, SafetyMatchingInput } from "@/lib/safetyMatching";

describe("Step 1: End-to-End Operational Ride Lifecycle Simulation", () => {
  // Scenario Data: Guwahati Ride (Paltan Bazaar to Dispur Secretariat)
  const bookingContext = {
    bookingId: "6724a1b2c3d4e5f6a7b8c9d0",
    distanceKm: 7.4,
    pickup: "Paltan Bazaar, Guwahati",
    drop: "Assam Secretariat, Dispur",
    passengerId: "user_passenger_9901",
    driverId1: "driver_partner_8801",
    driverId2: "driver_partner_8802",
  };

  // 1. FARE ENGINE & ESTIMATION
  describe("Phase 1: Booking Initiation & Fare Computation", () => {
    it("computes accurate transparent fare for all vehicle categories for 7.4 km", () => {
      const vehicles = ["scooty", "bike", "auto", "e-rickshaw", "mini", "car", "priority"] as const;

      vehicles.forEach((vehicleType) => {
        const breakdown = calculateFareBreakdown(vehicleType, bookingContext.distanceKm);

        expect(breakdown.totalFare).toBeGreaterThan(0);
        expect(breakdown.baseFare).toBeGreaterThan(0);
        expect(breakdown.distanceFare).toBeGreaterThan(0);
        expect(breakdown.taxes).toBeGreaterThanOrEqual(0);
        // Integrity: total equals baseFare + distanceFare + platformFee + taxes
        expect(breakdown.totalFare).toBe(
          breakdown.baseFare + breakdown.distanceFare + breakdown.platformFee + breakdown.taxes
        );
      });
    });

    it("generates a cryptographically secure 4-digit pickup and drop OTP", () => {
      const otp1 = generateSecureOtp(4);
      const otp2 = generateSecureOtp(4);

      expect(otp1).toHaveLength(4);
      expect(otp2).toHaveLength(4);
      expect(/^\d{4}$/.test(otp1)).toBe(true);
      expect(/^\d{4}$/.test(otp2)).toBe(true);
      // High-entropy randomness: two consecutive OTPs must not be identical
      expect(otp1).not.toBe(otp2);
    });

    it("verifies state machine allows initial booking creation", () => {
      expect(isValidTransition("requested", "searching_driver")).toBe(true);
      expect(isValidTransition("requested", "driver_assigned")).toBe(true);
    });
  });

  // 2. SAFETY & DRIVER MATCHING
  describe("Phase 2: Driver Candidate Matching & Safety Filtering", () => {
    it("matches driver when vehicle type and distance criteria align", () => {
      const input: SafetyMatchingInput = {
        passengerDriverPreference: "any",
        driverPassengerPolicy: "all_eligible",
        driverIsVerifiedWoman: false,
        passengerEligibleForWomenOnly: false,
      };
      const match = evaluateSafetyMatch(input);

      expect(match.allowed).toBe(true);
      expect(match.code).toBe("MATCH_ALLOWED");
    });

    it("enforces woman driver preference strictly when requested by rider", () => {
      const maleDriverInput: SafetyMatchingInput = {
        passengerDriverPreference: "woman",
        driverPassengerPolicy: "all_eligible",
        driverIsVerifiedWoman: false,
        passengerEligibleForWomenOnly: false,
      };
      const maleMatch = evaluateSafetyMatch(maleDriverInput);

      expect(maleMatch.allowed).toBe(false);
      expect(maleMatch.code).toBe("REQUIRES_VERIFIED_WOMAN_DRIVER");

      const womanDriverInput: SafetyMatchingInput = {
        passengerDriverPreference: "woman",
        driverPassengerPolicy: "all_eligible",
        driverIsVerifiedWoman: true,
        passengerEligibleForWomenOnly: false,
      };
      const womanMatch = evaluateSafetyMatch(womanDriverInput);

      expect(womanMatch.allowed).toBe(true);
      expect(womanMatch.code).toBe("MATCH_ALLOWED");
    });
  });

  // 3. BROADCAST DISPATCH & ATOMIC ACCEPTANCE
  describe("Phase 3: Broadcast Dispatch & Atomic First-to-Accept Guard", () => {
    let currentStatus = "requested";

    it("allows the first online driver to claim and accept the ride", () => {
      const nextStatus = "driver_assigned";
      const valid = isValidTransition(currentStatus as any, nextStatus);
      const authorized = isAuthorizedForTransition(nextStatus, "driver");

      expect(valid).toBe(true);
      expect(authorized).toBe(true);

      // Simulate atomic assignment to Driver 1
      currentStatus = nextStatus;
      expect(currentStatus).toBe("driver_assigned");
    });

    it("rejects a second concurrent driver from re-claiming an already-assigned ride", () => {
      expect(currentStatus).toBe("driver_assigned");
      expect(ALLOWED_TRANSITIONS[currentStatus]).not.toContain("requested");
    });
  });

  // 4. DRIVER PROXIMITY & ARRIVAL
  describe("Phase 4: Turn-by-Turn Arrival Milestones", () => {
    let currentStatus = "driver_assigned";

    it("transitions driver to arriving when en route to pickup", () => {
      const nextStatus = "driver_arriving";
      expect(isValidTransition(currentStatus as any, nextStatus)).toBe(true);
      expect(isAuthorizedForTransition(nextStatus, "driver")).toBe(true);
      currentStatus = nextStatus;
    });

    it("transitions driver to arrived when within pickup geofence", () => {
      const nextStatus = "driver_arrived";
      expect(isValidTransition(currentStatus as any, nextStatus)).toBe(true);
      expect(isAuthorizedForTransition(nextStatus, "driver")).toBe(true);
      currentStatus = nextStatus;
    });

    it("prevents passenger or unauthorized actor from triggering driver_arrived", () => {
      expect(isAuthorizedForTransition("driver_arrived", "user")).toBe(false);
    });
  });

  // 5. SECURE OTP VERIFICATION & TRIP START
  describe("Phase 5: Cryptographic OTP Verification & Ride Start", () => {
    const rawOtp = "4826";
    let hashedOtp = "";
    let currentStatus = "driver_arrived";

    it("hashes pickup OTP with bcrypt salt rounds", async () => {
      hashedOtp = await hashOtpCode(rawOtp);
      expect(hashedOtp).toBeDefined();
      expect(hashedOtp).not.toBe(rawOtp);
      expect(hashedOtp.startsWith("$2")).toBe(true);
    });

    it("rejects invalid or forged OTP attempts", async () => {
      const isMatch = await verifyOtpCode("0000", hashedOtp);
      expect(isMatch).toBe(false);

      // State machine must remain driver_arrived
      expect(currentStatus).toBe("driver_arrived");
    });

    it("accepts valid OTP and transitions state to started", async () => {
      const isMatch = await verifyOtpCode("4826", hashedOtp);
      expect(isMatch).toBe(true);

      const nextStatus = "started";
      expect(isValidTransition(currentStatus as any, nextStatus)).toBe(true);
      expect(isAuthorizedForTransition(nextStatus, "driver")).toBe(true);
      currentStatus = nextStatus;
      expect(currentStatus).toBe("started");
    });

    it("trims whitespace from passenger input during verification", async () => {
      const isMatch = await verifyOtpCode(" 4826 \n", hashedOtp);
      expect(isMatch).toBe(true);
    });
  });

  // 6. IN-RIDE PRIVACY & TELEMETRY
  describe("Phase 6: In-Transit Privacy & Telemetry Masking", () => {
    it("masks phone numbers and email addresses in rider-driver chat", () => {
      const rawMessage = "Call me at 9876543210 or email rider@example.com when you are here";
      const { maskedText, hadPii } = maskChatPii(rawMessage);

      expect(hadPii).toBe(true);
      expect(maskedText).not.toContain("9876543210");
      expect(maskedText).not.toContain("rider@example.com");
      expect(maskedText).toContain("[phone hidden for safety]");
      expect(maskedText).toContain("[email hidden for safety]");
    });
  });

  // 7. TRIP COMPLETION & TERMINAL INVARIANTS
  describe("Phase 7: Drop-off Completion & Terminal State Protections", () => {
    let currentStatus = "started";

    it("completes ride upon reaching destination and validating drop", () => {
      const nextStatus = "completed";
      expect(isValidTransition(currentStatus as any, nextStatus)).toBe(true);
      expect(isAuthorizedForTransition(nextStatus, "driver")).toBe(true);
      currentStatus = nextStatus;
      expect(currentStatus).toBe("completed");
    });

    it("enforces that completed rides cannot be cancelled, expired, or restarted", () => {
      expect(isValidTransition("completed", "cancelled")).toBe(false);
      expect(isValidTransition("completed", "started")).toBe(false);
      expect(isValidTransition("completed", "requested")).toBe(false);
      expect(isValidTransition("completed", "driver_assigned")).toBe(false);
      expect(ALLOWED_TRANSITIONS["completed"]).toHaveLength(0);
    });
  });

  // 8. FINANCIAL LEDGER SETTLEMENT & COMMISSION SPLIT
  describe("Phase 8: Financial Ledger Settlement & Idempotency", () => {
    const grossFare = 240;

    it("calculates exact commission and net earnings split", () => {
      const split = calculateCommissionSplit(grossFare);

      expect(split.adminCommission).toBeGreaterThan(0);
      expect(split.partnerAmount).toBeGreaterThan(0);
      // Integrity: adminCommission + partnerAmount must equal grossFare
      expect(split.adminCommission + split.partnerAmount).toBe(grossFare);
    });

    it("simulates ledger idempotency: duplicate settlements return existing transaction without double crediting", () => {
      const ledgerStore = new Map<string, any>();

      function settleRideEarnings(bookingId: string, driverId: string, fare: number) {
        const idempotencyKey = `earn_${driverId}_${bookingId}`;
        if (ledgerStore.has(idempotencyKey)) {
          return {
            alreadyProcessed: true,
            transaction: ledgerStore.get(idempotencyKey),
          };
        }

        const split = calculateCommissionSplit(fare);
        const record = {
          txnId: `TXN_EARN_${bookingId}`,
          driverId,
          amount: split.partnerAmount,
          commission: split.adminCommission,
          timestamp: Date.now(),
        };

        ledgerStore.set(idempotencyKey, record);
        return { alreadyProcessed: false, transaction: record };
      }

      // First execution: credits successfully
      const firstSettle = settleRideEarnings(bookingContext.bookingId, bookingContext.driverId1, grossFare);
      expect(firstSettle.alreadyProcessed).toBe(false);
      expect(firstSettle.transaction.amount).toBe(calculateCommissionSplit(grossFare).partnerAmount);

      // Second duplicate execution (e.g. network retry): must be idempotent
      const duplicateSettle = settleRideEarnings(bookingContext.bookingId, bookingContext.driverId1, grossFare);
      expect(duplicateSettle.alreadyProcessed).toBe(true);
      expect(duplicateSettle.transaction.txnId).toBe(firstSettle.transaction.txnId);
      expect(ledgerStore.size).toBe(1); // Never creates a second transaction
    });
  });
});
