/**
 * Mobile Validation Utilities
 * Provides consistent validation for mobile app matching web app standards
 */

// Unicode name validation pattern (matches web app)
const NAME_PATTERN = /^[\p{L}\s\-'.]+$/u;
const CITY_PATTERN = /^[\p{L}\s\-'.]+$/u;

// Constants
const MIN_AGE = 18;
const MAX_AGE = 120;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;
const MAX_CITY_LENGTH = 50;
const MAX_EDUCATION_LENGTH = 100;
const MAX_OCCUPATION_LENGTH = 100;
const MAX_BIO_LENGTH = 500;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate full name - supports international Unicode names
 */
export function validateName(name: string): ValidationResult {
  if (!name) {
    return { valid: false, error: 'Name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < MIN_NAME_LENGTH) {
    return { valid: false, error: `Name must be at least ${MIN_NAME_LENGTH} characters` };
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Name must be less than ${MAX_NAME_LENGTH} characters` };
  }

  if (!NAME_PATTERN.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid characters' };
  }

  // Reject consecutive special characters
  if (/[\-'.]{2,}/.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid character sequences' };
  }

  // Must contain at least one letter
  if (!/\p{L}/u.test(trimmed)) {
    return { valid: false, error: 'Name must contain at least one letter' };
  }

  return { valid: true };
}

/**
 * Validate city - supports international Unicode names
 */
export function validateCity(city: string): ValidationResult {
  if (!city) {
    return { valid: false, error: 'City is required' };
  }

  const trimmed = city.trim();

  if (trimmed.length < MIN_NAME_LENGTH) {
    return { valid: false, error: 'City name is too short' };
  }

  if (trimmed.length > MAX_CITY_LENGTH) {
    return { valid: false, error: `City must be less than ${MAX_CITY_LENGTH} characters` };
  }

  if (!CITY_PATTERN.test(trimmed)) {
    return { valid: false, error: 'City name contains invalid characters' };
  }

  return { valid: true };
}

/**
 * Validate date of birth - checks format, calendar validity, and age
 */
export function validateDateOfBirth(
  year: string,
  month: string,
  day: string
): ValidationResult {
  if (!year || !month || !day) {
    return { valid: false, error: 'Complete date of birth is required' };
  }

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  // Check valid numbers
  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    return { valid: false, error: 'Invalid date format' };
  }

  // Check valid ranges
  if (y < 1900 || y > new Date().getFullYear()) {
    return { valid: false, error: 'Invalid year' };
  }

  if (m < 1 || m > 12) {
    return { valid: false, error: 'Invalid month' };
  }

  if (d < 1 || d > 31) {
    return { valid: false, error: 'Invalid day' };
  }

  // Check valid calendar date (handles Feb 29, Jun 31, etc.)
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() + 1 !== m ||
    date.getDate() !== d
  ) {
    return { valid: false, error: 'Invalid calendar date' };
  }

  // Calculate age
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age--;
  }

  if (age < MIN_AGE) {
    return { valid: false, error: `You must be at least ${MIN_AGE} years old` };
  }

  if (age > MAX_AGE) {
    return { valid: false, error: 'Please enter a valid date of birth' };
  }

  return { valid: true };
}

/**
 * Validate height - supports cm and feet/inches formats
 */
export function validateHeight(height: string): ValidationResult {
  if (!height) {
    return { valid: false, error: 'Height is required' };
  }

  const trimmed = height.trim();

  // Try cm format: "170", "170cm", "170 cm"
  const cmMatch = trimmed.match(/^(\d{2,3})\s*(?:cm)?$/i);
  if (cmMatch) {
    const cm = parseInt(cmMatch[1], 10);
    if (cm >= 100 && cm <= 250) {
      return { valid: true };
    }
    return { valid: false, error: 'Height must be between 100cm and 250cm' };
  }

  // Try feet/inches format: 5'8", 5'8, 5′8″
  const feetMatch = trimmed.match(/^([4-7])['′]\s*([0-9]|1[01])(?:["″])?$/i);
  if (feetMatch) {
    const feet = parseInt(feetMatch[1], 10);
    const inches = parseInt(feetMatch[2], 10);
    const cm = Math.round((feet * 12 + inches) * 2.54);
    if (cm >= 100 && cm <= 250) {
      return { valid: true };
    }
  }

  return { valid: false, error: 'Enter height as "170 cm" or "5\'8"' };
}

/**
 * Validate education length
 */
export function validateEducation(education: string): ValidationResult {
  if (!education) {
    return { valid: false, error: 'Education is required' };
  }

  const trimmed = education.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Education is too short' };
  }

  if (trimmed.length > MAX_EDUCATION_LENGTH) {
    return { valid: false, error: `Education must be less than ${MAX_EDUCATION_LENGTH} characters` };
  }

  return { valid: true };
}

/**
 * Validate occupation length
 */
export function validateOccupation(occupation: string): ValidationResult {
  if (!occupation) {
    return { valid: false, error: 'Occupation is required' };
  }

  const trimmed = occupation.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Occupation is too short' };
  }

  if (trimmed.length > MAX_OCCUPATION_LENGTH) {
    return { valid: false, error: `Occupation must be less than ${MAX_OCCUPATION_LENGTH} characters` };
  }

  return { valid: true };
}

/**
 * Validate bio length
 */
export function validateBio(bio: string): ValidationResult {
  const trimmed = (bio || '').trim();

  if (trimmed.length > MAX_BIO_LENGTH) {
    return { valid: false, error: `Bio must be less than ${MAX_BIO_LENGTH} characters` };
  }

  return { valid: true };
}

/**
 * Validate phone number - consistent with web app standards
 * Accepts international format: 10-15 digits
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }

  // Only allow digits, plus sign, spaces, and hyphens
  if (/[^\d+\s\-()]/.test(phone)) {
    return { valid: false, error: 'Phone number contains invalid characters' };
  }

  // Only one plus sign at the start
  const plusCount = (phone.match(/\+/g) || []).length;
  if (plusCount > 1) {
    return { valid: false, error: 'Invalid phone format' };
  }
  if (phone.includes('+') && !phone.startsWith('+')) {
    return { valid: false, error: 'Plus sign must be at the beginning' };
  }

  // Must have 10-15 digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    return { valid: false, error: 'Phone number must be at least 10 digits' };
  }
  if (digits.length > 15) {
    return { valid: false, error: 'Phone number is too long' };
  }

  return { valid: true };
}
