import { describe, it, expect } from "vitest";
import {
  validateIfsc,
  validateBankAccount,
  validateUpiId,
  validateMobileNumber,
  sanitizeChatText,
  sanitizeFeedbackText,
  validateCoordinates,
  validatePhoneNumber,
  validateEmail,
  validateObjectId,
  validateAmount,
  sanitizeString,
} from "@/lib/validation";

describe("Input Validation and Sanitization Invariants", () => {
  describe("validateIfsc", () => {
    it("accepts valid Indian bank IFSC codes", () => {
      expect(validateIfsc("SBIN0001234").isValid).toBe(true);
      expect(validateIfsc("HDFC0000001").isValid).toBe(true);
      expect(validateIfsc("icic0001122").isValid).toBe(true); // lower-case normalized
      expect(validateIfsc("icic0001122").normalized).toBe("ICIC0001122");
      expect(validateIfsc("PUNB0123400").isValid).toBe(true);
    });

    it("rejects invalid or malformed IFSC codes", () => {
      expect(validateIfsc("").isValid).toBe(false);
      expect(validateIfsc("SBIN1234").isValid).toBe(false); // too short
      expect(validateIfsc("SBIN1001234").isValid).toBe(false); // 5th char not '0'
      expect(validateIfsc("12340001234").isValid).toBe(false); // first 4 not letters
      expect(validateIfsc("HDFC00012345").isValid).toBe(false); // too long
      expect(validateIfsc(null).isValid).toBe(false);
    });
  });

  describe("validateBankAccount", () => {
    it("accepts standard 9 to 18 digit account numbers", () => {
      expect(validateBankAccount("123456789").isValid).toBe(true);
      expect(validateBankAccount("123456789012345").isValid).toBe(true);
      expect(validateBankAccount("123456789012345678").isValid).toBe(true);
      expect(validateBankAccount(" 987654321012 ").normalized).toBe("987654321012");
      expect(validateBankAccount(123456789012).isValid).toBe(true);
    });

    it("rejects non-digit or out-of-range account numbers", () => {
      expect(validateBankAccount("12345678").isValid).toBe(false); // 8 digits (too short)
      expect(validateBankAccount("1234567890123456789").isValid).toBe(false); // 19 digits (too long)
      expect(validateBankAccount("12345-6789").isValid).toBe(false);
      expect(validateBankAccount("1234ABCD5678").isValid).toBe(false);
      expect(validateBankAccount("").isValid).toBe(false);
      expect(validateBankAccount(null).isValid).toBe(false);
    });
  });

  describe("validateUpiId", () => {
    it("accepts standard UPI virtual payment addresses", () => {
      expect(validateUpiId("driver@oksbi").isValid).toBe(true);
      expect(validateUpiId("partner.rides@paytm").isValid).toBe(true);
      expect(validateUpiId("User-123@icici").isValid).toBe(true);
      expect(validateUpiId("").isValid).toBe(true); // Optional field
    });

    it("rejects malformed or invalid UPI VPAs", () => {
      expect(validateUpiId("invalid_upi_without_handle").isValid).toBe(false);
      expect(validateUpiId("@bank").isValid).toBe(false);
      expect(validateUpiId("name@").isValid).toBe(false);
      expect(validateUpiId("user@@hdfc").isValid).toBe(false);
    });
  });

  describe("validateMobileNumber", () => {
    it("accepts valid Indian 10-digit mobile numbers with formatting", () => {
      expect(validateMobileNumber("9876543210").isValid).toBe(true);
      expect(validateMobileNumber("+91 9876543210").isValid).toBe(true);
      expect(validateMobileNumber("+91-8123456789").normalized).toBe("8123456789");
      expect(validateMobileNumber("").isValid).toBe(true); // Optional in partial profiles
    });

    it("rejects numbers not starting with 6-9 or invalid lengths", () => {
      expect(validateMobileNumber("5551234567").isValid).toBe(false);
      expect(validateMobileNumber("12345").isValid).toBe(false);
      expect(validateMobileNumber("abcdefghij").isValid).toBe(false);
    });
  });

  describe("sanitizeChatText", () => {
    it("strips HTML tags and script injections", () => {
      const res = sanitizeChatText("<script>alert('xss')</script>Hello driver!");
      expect(res.isValid).toBe(true);
      expect(res.sanitized).toBe("alert('xss')Hello driver!");
      expect(res.sanitized).not.toContain("<script>");
    });

    it("rejects empty or whitespace-only messages", () => {
      expect(sanitizeChatText("").isValid).toBe(false);
      expect(sanitizeChatText("   \n\t  ").isValid).toBe(false);
      expect(sanitizeChatText("<b></b>").isValid).toBe(false);
    });

    it("enforces maximum message length bounds", () => {
      const longText = "a".repeat(501);
      const res = sanitizeChatText(longText, 500);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("500 characters");
    });
  });

  describe("sanitizeFeedbackText", () => {
    it("strips HTML tags and caps feedback length", () => {
      const dirty = "<p>Great trip! <b>Safe driving</b></p>";
      expect(sanitizeFeedbackText(dirty)).toBe("Great trip! Safe driving");
      expect(sanitizeFeedbackText("x".repeat(600), 500).length).toBe(500);
    });
  });

  describe("validateCoordinates", () => {
    it("accepts valid latitude and longitude ranges", () => {
      const res = validateCoordinates(26.1445, 91.7362); // Guwahati
      expect(res.valid).toBe(true);
      expect(res.value).toEqual([26.1445, 91.7362]);
    });

    it("rejects out-of-range coordinates", () => {
      expect(validateCoordinates(95, 91).valid).toBe(false);
      expect(validateCoordinates(-95, 91).valid).toBe(false);
      expect(validateCoordinates(26, 190).valid).toBe(false);
      expect(validateCoordinates("invalid", "coords").valid).toBe(false);
    });
  });

  describe("validatePhoneNumber", () => {
    it("accepts valid Indian phone numbers and strips formatting", () => {
      const res = validatePhoneNumber("+91-9876543210");
      expect(res.valid).toBe(true);
      expect(res.value).toBe("9876543210");
    });

    it("rejects invalid numbers", () => {
      expect(validatePhoneNumber("12345").valid).toBe(false);
      expect(validatePhoneNumber("").valid).toBe(false);
      expect(validatePhoneNumber(null).valid).toBe(false);
    });
  });

  describe("validateEmail", () => {
    it("validates RFC standard email addresses", () => {
      const res = validateEmail("Passenger@example.com");
      expect(res.valid).toBe(true);
      expect(res.value).toBe("passenger@example.com");
    });

    it("rejects invalid emails", () => {
      expect(validateEmail("not-an-email").valid).toBe(false);
      expect(validateEmail("user@.com").valid).toBe(false);
      expect(validateEmail("").valid).toBe(false);
    });
  });

  describe("validateObjectId", () => {
    it("accepts valid 24-character hexadecimal MongoDB ObjectIds", () => {
      expect(validateObjectId("507f1f77bcf86cd799439011").valid).toBe(true);
    });

    it("rejects malformed ObjectIds", () => {
      expect(validateObjectId("invalid-id").valid).toBe(false);
      expect(validateObjectId("").valid).toBe(false);
      expect(validateObjectId(12345).valid).toBe(false);
    });
  });

  describe("validateAmount", () => {
    it("validates amounts within minimum and maximum bounds", () => {
      const res = validateAmount(150.75, 10, 1000);
      expect(res.valid).toBe(true);
      expect(res.value).toBe(150.75);
    });

    it("rejects amounts outside bounds or NaN", () => {
      expect(validateAmount(5, 10, 1000).valid).toBe(false);
      expect(validateAmount(1500, 10, 1000).valid).toBe(false);
      expect(validateAmount("not-a-number").valid).toBe(false);
    });
  });

  describe("sanitizeString", () => {
    it("strips HTML angle brackets and control characters", () => {
      const clean = sanitizeString("<script>alert(1)</script>Hello \x00World", 20);
      expect(clean).toBe("scriptalert(1)/scrip");
      expect(clean).not.toContain("<");
      expect(clean).not.toContain(">");
      expect(clean).not.toContain("\x00");
    });
  });
});
