/**
 * Robust Date Validation Utility
 * Addresses date validation vulnerabilities:
 * - Invalid calendar date auto-correction (Feb 29 on non-leap years, Jun 31, etc.)
 * - Timezone issues in age calculations
 * - Format validation (YYYY-MM-DD expected)
 * - Age range enforcement (18-120)
 */

export interface DateValidationResult {
  isValid: boolean;
  error?: string;
  age?: number;
}

// Expected date format: YYYY-MM-DD
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Constants for age validation
const MIN_AGE = 18;
const MAX_AGE = 120;

/**
 * Check if a year is a leap year
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get the maximum days for a given month in a given year
 */
function getMaxDaysInMonth(year: number, month: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return daysInMonth[month - 1] || 0;
}

/**
 * Validates that the date string is a valid calendar date
 * This catches dates like Feb 29 on non-leap years, Jun 31, etc.
 */
function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  
  const maxDays = getMaxDaysInMonth(year, month);
  return day <= maxDays;
}

/**
 * Parse date string and validate it's a real calendar date
 * Uses UTC to avoid timezone issues
 */
function parseAndValidateDate(dateString: string): { 
  valid: boolean; 
  date?: Date; 
  year?: number;
  month?: number;
  day?: number;
  error?: string;
} {
  // Check format (YYYY-MM-DD)
  if (!DATE_FORMAT_REGEX.test(dateString)) {
    return { 
      valid: false, 
      error: 'Date must be in YYYY-MM-DD format' 
    };
  }

  const parts = dateString.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  // Basic range checks
  if (year < 1900 || year > 2100) {
    return { valid: false, error: 'Year must be between 1900 and 2100' };
  }

  // Validate this is a real calendar date
  if (!isValidCalendarDate(year, month, day)) {
    return { 
      valid: false, 
      error: 'Invalid calendar date (e.g., Feb 30 does not exist)' 
    };
  }

  // Create UTC date to avoid timezone issues
  // Using Date.UTC ensures consistent parsing regardless of local timezone
  const date = new Date(Date.UTC(year, month - 1, day));

  // Double-check the parsed date matches input (catches any JS auto-correction)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return { 
      valid: false, 
      error: 'Date was auto-corrected; please enter a valid date' 
    };
  }

  return { valid: true, date, year, month, day };
}

/**
 * Formats/parses a date from various types (string, number, Date, or Firestore Timestamp object)
 * Returns a valid Date object or null if parsing fails.
 */
export function deriveDateFromAny(dob: any): Date | null {
  if (!dob) return null;

  try {
    // 1. If it's already a Date object
    if (dob instanceof Date) {
      return isNaN(dob.getTime()) ? null : dob;
    }

    // 2. If it's a number (timestamp)
    if (typeof dob === "number") {
      const dt = new Date(dob);
      return isNaN(dt.getTime()) ? null : dt;
    }

    // 3. If it's a string
    if (typeof dob === "string") {
      const trimmed = dob.trim();
      // Try robust parsing first if it matches YYYY-MM-DD
      if (DATE_FORMAT_REGEX.test(trimmed)) {
        const parsed = parseAndValidateDate(trimmed);
        return parsed.valid ? parsed.date || null : null;
      }
      // Fallback for other string formats
      const dt = new Date(trimmed);
      return isNaN(dt.getTime()) ? null : dt;
    }

    // 4. If it's a Firestore Timestamp-like object
    if (typeof dob === "object") {
      if (typeof dob.toDate === "function") {
        return dob.toDate();
      }
      if (typeof dob.seconds === "number") {
        return new Date(dob.seconds * 1000);
      }
    }
  } catch (error) {
    console.warn("Date derivation failed", error);
  }

  return null;
}

/**
 * Calculate age from a birth date, handling timezone correctly
 * Uses UTC dates to avoid off-by-one errors
 */
export function calculateAge(birthDate: Date, referenceDate?: Date): number {
  const reference = referenceDate || new Date();
  // Use UTC for both to ensure consistency
  const birthYear = birthDate.getUTCFullYear();
  const birthMonth = birthDate.getUTCMonth();
  const birthDay = birthDate.getUTCDate();

  const currentYear = reference.getUTCFullYear();
  const currentMonth = reference.getUTCMonth();
  const currentDay = reference.getUTCDate();

  let age = currentYear - birthYear;

  // Adjust if birthday hasn't occurred this year yet
  if (
    currentMonth < birthMonth ||
    (currentMonth === birthMonth && currentDay < birthDay)
  ) {
    age--;
  }

  return age;
}

/**
 * Check if a date is not in the future
 */
function isNotFuture(date: Date): boolean {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return date <= today;
}

/**
 * Main validation function for date of birth
 * Validates format, calendar correctness, and age range
 */
export function validateDateOfBirth(dateString: string): DateValidationResult {
  // Handle empty/null input
  if (!dateString || typeof dateString !== 'string') {
    return { isValid: false, error: 'Date of birth is required' };
  }

  const trimmed = dateString.trim();

  // Parse and validate the date
  const parsed = parseAndValidateDate(trimmed);
  if (!parsed.valid || !parsed.date) {
    return { isValid: false, error: parsed.error };
  }

  // Check date is not in the future
  if (!isNotFuture(parsed.date)) {
    return { isValid: false, error: 'Date of birth cannot be in the future' };
  }

  // Calculate and validate age
  const age = calculateAge(parsed.date);

  if (age < MIN_AGE) {
    return { 
      isValid: false, 
      error: `You must be at least ${MIN_AGE} years old`,
      age 
    };
  }

  if (age > MAX_AGE) {
    return { 
      isValid: false, 
      error: `Age cannot exceed ${MAX_AGE} years. Please enter a valid date of birth`,
      age 
    };
  }

  return { isValid: true, age };
}

/**
 * Validates age only (for use with existing date validation)
 * Returns true if age is within valid range (18-120)
 */
export function validateAge(dateString: string): boolean {
  const result = validateDateOfBirth(dateString);
  return result.isValid;
}

/**
 * Calculate age from date string with proper timezone handling
 * Returns null if date is invalid
 */
export function calculateAgeFromDateString(dateString: string): number | null {
  const result = validateDateOfBirth(dateString);
  if (result.isValid && result.age !== undefined) {
    return result.age;
  }
  return null;
}

/**
 * Format validation only (checks YYYY-MM-DD format and calendar validity)
 * Does not check age requirements
 */
export function isValidDateFormat(dateString: string): boolean {
  if (!dateString) return false;
  const parsed = parseAndValidateDate(dateString.trim());
  return parsed.valid;
}
