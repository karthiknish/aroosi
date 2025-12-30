export function validateEmail(email: string): boolean {
  // Basic email pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  // Disallow consecutive dots in the local part
  const [local] = email.split("@");
  if (local.includes("..")) return false;
  return true;
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate name - consistent with profileSchema
 * Supports Unicode, rejects consecutive special chars
 */
export function validateName(name: string): boolean {
  if (!name) return false;
  
  const trimmed = name.trim();
  
  // Minimum 2 characters
  if (trimmed.length < 2) return false;
  
  // Maximum 100 characters
  if (trimmed.length > 100) return false;
  
  // Allow Unicode letters, spaces, hyphens, apostrophes, periods
  const namePattern = /^[\p{L}\s\-'.]+$/u;
  if (!namePattern.test(trimmed)) return false;
  
  // Reject consecutive special characters
  if (/[\-'.]{2,}/.test(trimmed)) return false;
  
  // Must contain at least one letter
  if (!/\p{L}/u.test(trimmed)) return false;
  
  return true;
}

/**
 * Validate phone number - consistent with profileSchema
 * Accepts international format: 10-15 digits
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false;
  // Only allow digits, plus sign, spaces, and hyphens
  if (/[^\d+\s\-()]/.test(phone)) return false;
  // Only one plus sign at the start
  if ((phone.match(/\+/g) || []).length > 1) return false;
  if (phone.includes('+') && !phone.startsWith('+')) return false;
  // Must have 10-15 digits
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function sanitizeInput(input: string): string {
  // Remove angle brackets and ampersands which are risky in HTML contexts
  let output = input.replace(/[<>&]/g, "");
  // Remove quotes around standalone quoted words or phrases e.g. "quoted" -> quoted
  // Keep quotes inside parentheses like alert("xss")
  output = output.replace(/(^|\s)"([^"\n]+)"(?=\s|$)/g, "$1$2");
  return output;
}

export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function validatePostcode(postcode: string): boolean {
  // UK postcode validation
  const countryRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
  return countryRegex.test(postcode.trim());
}

// Zod schema for postcode validation
import { z } from 'zod';

export const postcodeSchema = z.string()
  .min(1, 'Postcode is required')
  .refine(validatePostcode, 'Please enter a valid UK postcode');