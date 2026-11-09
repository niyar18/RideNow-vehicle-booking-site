/**
 * Core validation and sanitization helpers for RideNow / Jaatri
 * Compliant with OWASP input validation standards, Indian financial format rules,
 * and geographical coordinate integrity standards.
 */

import mongoose from "mongoose";

// RBI Standard IFSC: 4 uppercase alphabets, 5th character '0', followed by 6 alphanumeric characters
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// Indian Bank Account Number: 9 to 18 numeric digits
const BANK_ACCOUNT_REGEX = /^\d{9,18}$/;

// UPI Virtual Payment Address (VPA): e.g. name@okaxis, driver@upi
const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

// Indian 10-digit mobile number starting with 6, 7, 8, or 9
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export interface ValidationResult<T = any> {
  valid: boolean;
  value?: T;
  error?: string;
}

export function validateIfsc(ifsc: unknown): { isValid: boolean; normalized: string; error?: string } {
  if (!ifsc || typeof ifsc !== "string") {
    return { isValid: false, normalized: "", error: "IFSC code is required" };
  }
  const clean = ifsc.trim().toUpperCase();
  if (!IFSC_REGEX.test(clean)) {
    return {
      isValid: false,
      normalized: clean,
      error: "Invalid IFSC format. Must be 11 characters with 5th character as 0 (e.g. SBIN0001234)",
    };
  }
  return { isValid: true, normalized: clean };
}

export function validateBankAccount(account: unknown): { isValid: boolean; normalized: string; error?: string } {
  if (account === undefined || account === null || account === "") {
    return { isValid: false, normalized: "", error: "Account number is required" };
  }
  const clean = String(account).trim().replace(/\s+/g, "");
  if (!BANK_ACCOUNT_REGEX.test(clean)) {
    return {
      isValid: false,
      normalized: clean,
      error: "Account number must be between 9 and 18 numeric digits without spaces or special characters",
    };
  }
  return { isValid: true, normalized: clean };
}

export function validateUpiId(upi: unknown): { isValid: boolean; normalized: string; error?: string } {
  if (!upi || typeof upi !== "string" || !upi.trim()) {
    return { isValid: true, normalized: "" }; // Optional
  }
  const clean = upi.trim().toLowerCase();
  if (!UPI_REGEX.test(clean)) {
    return {
      isValid: false,
      normalized: clean,
      error: "Invalid UPI ID format. Must be in handle format (e.g. driver@oksbi)",
    };
  }
  return { isValid: true, normalized: clean };
}

export function validateMobileNumber(mobile: unknown): { isValid: boolean; normalized: string; error?: string } {
  if (!mobile || (typeof mobile !== "string" && typeof mobile !== "number")) {
    return { isValid: true, normalized: "" }; // Optional in partial updates
  }
  const clean = String(mobile).trim().replace(/[\s\-+]/g, "").slice(-10);
  if (!INDIAN_MOBILE_REGEX.test(clean)) {
    return {
      isValid: false,
      normalized: clean,
      error: "Please enter a valid 10-digit Indian mobile number",
    };
  }
  return { isValid: true, normalized: clean };
}

export function sanitizeChatText(text: unknown, maxLength = 500): { isValid: boolean; sanitized: string; error?: string } {
  if (!text || typeof text !== "string") {
    return { isValid: false, sanitized: "", error: "Message text is required" };
  }
  // Strip HTML tags and ASCII control characters (keep standard newlines/tabs)
  const stripped = text
    .replace(/<[^>]*>?/gm, "")
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "")
    .trim();

  if (stripped.length === 0) {
    return { isValid: false, sanitized: "", error: "Message cannot be empty or contain only whitespace" };
  }
  if (stripped.length > maxLength) {
    return {
      isValid: false,
      sanitized: stripped.slice(0, maxLength),
      error: `Message exceeds maximum limit of ${maxLength} characters`,
    };
  }
  return { isValid: true, sanitized: stripped };
}

export function sanitizeFeedbackText(feedback: unknown, maxLength = 500): string {
  if (!feedback || typeof feedback !== "string") return "";
  return feedback
    .replace(/<[^>]*>?/gm, "")
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates geographical coordinates (Latitude: -90 to +90, Longitude: -180 to +180).
 */
export function validateCoordinates(lat: any, lng: any): ValidationResult<[number, number]> {
  const latitude = typeof lat === "number" ? lat : parseFloat(lat);
  const longitude = typeof lng === "number" ? lng : parseFloat(lng);

  if (isNaN(latitude) || latitude < -90 || latitude > 90) {
    return { valid: false, error: "Invalid latitude. Must be between -90 and 90." };
  }

  if (isNaN(longitude) || longitude < -180 || longitude > 180) {
    return { valid: false, error: "Invalid longitude. Must be between -180 and 180." };
  }

  return { valid: true, value: [latitude, longitude] };
}

/**
 * Validates and normalizes 10-digit phone numbers.
 */
export function validatePhoneNumber(phone: any): ValidationResult<string> {
  if (!phone || typeof phone !== "string") {
    return { valid: false, error: "Phone number is required" };
  }

  const cleaned = phone.replace(/\D/g, "");
  const tenDigits = cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;

  if (tenDigits.length !== 10 || !/^[6-9]\d{9}$/.test(tenDigits)) {
    return { valid: false, error: "Invalid phone number. Must be a valid 10-digit mobile number." };
  }

  return { valid: true, value: tenDigits };
}

/**
 * Validates and sanitizes email addresses.
 */
export function validateEmail(email: any): ValidationResult<string> {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }

  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(trimmed) || trimmed.length > 254) {
    return { valid: false, error: "Invalid email format" };
  }

  return { valid: true, value: trimmed };
}

/**
 * Validates MongoDB ObjectId.
 */
export function validateObjectId(id: any): ValidationResult<string> {
  if (!id || typeof id !== "string") {
    return { valid: false, error: "Identifier is required" };
  }

  const trimmed = id.trim();
  if (!mongoose.Types.ObjectId.isValid(trimmed)) {
    return { valid: false, error: "Invalid resource identifier format" };
  }

  return { valid: true, value: trimmed };
}

/**
 * Validates monetary amounts or positive integers.
 */
export function validateAmount(amount: any, min = 1, max = 1000000): ValidationResult<number> {
  const num = typeof amount === "number" ? amount : parseFloat(amount);

  if (isNaN(num) || num < min || num > max) {
    return { valid: false, error: `Amount must be a valid number between ₹${min} and ₹${max}.` };
  }

  return { valid: true, value: Math.round(num * 100) / 100 };
}

/**
 * Sanitizes plain string inputs against script tags and control characters.
 */
export function sanitizeString(str: any, maxLength = 500): string {
  if (typeof str !== "string") return "";
  return str
    .replace(/[<>]/g, "") // strip html/script tag markers
    .replace(/[\x00-\x1F\x7F]/g, "") // strip non-printable ascii
    .trim()
    .slice(0, maxLength);
}
