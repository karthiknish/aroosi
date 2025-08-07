export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return { isValid: errors.length === 0, errors };
}

export function validateName(name: string): boolean {
  const trimmed = name;
  // Allow letters (including unicode), spaces, apostrophes and hyphens
  // Disallow numbers and other symbols; ensure at least 2 letters overall
  // Use a conservative ASCII fallback if the runtime doesn't support Unicode property escapes
  let allowed: RegExp;
  try {
    allowed = new RegExp("^(?=.*\\p{L}.*\\p{L})[\\p{L}\\s'\\-]+$", "u");
  } catch {
    // Fallback: letters a-z (case-insensitive), spaces, apostrophes and hyphens
    allowed = /^(?=.*[a-zA-Z].*[a-zA-Z])[a-zA-Z\s'\-]+$/;
  }
  if (!allowed.test(trimmed)) return false;
  // Disallow all-whitespace
  return trimmed.trim().length >= 2;
}

export function validatePhone(phone: string): boolean {
  if (!phone) return false;
  // Reject letters or multiple plus signs
  if (/[^\d+\s]/.test(phone)) return false;
  if ((phone.match(/\+/g) || []).length > 1) return false;
  // Must have at least 10 digits overall
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10;
}

export function sanitizeInput(input: string): string {
  // Remove angle brackets and ampersands which are risky in HTML contexts
  let output = input.replace(/[<>&]/g, "");
  // Remove quotes when they appear as standalone punctuation around words (e.g. Test "quoted" text)
  // Keep quotes that are inside parentheses like alert("xss")
  output = output.replace(/(\s)"(\s)/g, "$1$2");
  output = output.replace(/^"(\s)/, "$1").replace(/(\s)"$/, "$1");
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