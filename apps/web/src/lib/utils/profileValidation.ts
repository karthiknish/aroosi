import { validateDateOfBirth, isValidDateFormat } from "../validation/dateValidation";

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates profile data for security and correctness
 */
export function validateProfileData(data: Record<string, unknown>): ValidationResult {
  // Validate fullName - supports international Unicode names
  if (data.fullName !== undefined) {
    if (typeof data.fullName !== 'string') {
      return { isValid: false, error: 'Full name must be a string' };
    }
    const trimmed = data.fullName.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      return { isValid: false, error: 'Full name must be between 2 and 100 characters' };
    }
    // Unicode letter pattern - supports José, 北京, Москва, etc.
    if (!/^[\p{L}\s\-'.]+$/u.test(trimmed)) {
      return { isValid: false, error: 'Full name contains invalid characters' };
    }
    // Reject consecutive special characters
    if (/[\-'.]{2,}/.test(trimmed)) {
      return { isValid: false, error: 'Full name contains invalid character sequences' };
    }
    // Must contain at least one letter
    if (!/\p{L}/u.test(trimmed)) {
      return { isValid: false, error: 'Full name must contain at least one letter' };
    }
  }

  // Validate dateOfBirth using robust validation
  if (data.dateOfBirth !== undefined) {
    if (typeof data.dateOfBirth !== 'string') {
      return { isValid: false, error: 'Date of birth must be a string' };
    }
    const dateResult = validateDateOfBirth(data.dateOfBirth);
    if (!dateResult.isValid) {
      return { isValid: false, error: dateResult.error || 'Invalid date of birth' };
    }
  }

  // Validate gender
  if (data.gender !== undefined) {
    if (!['male', 'female', 'non-binary', 'other'].includes(data.gender as string)) {
      return { isValid: false, error: 'Invalid gender value' };
    }
  }

  // Validate preferredGender
  if (data.preferredGender !== undefined) {
    if (!['male', 'female', 'non-binary', 'other', 'any', ''].includes(data.preferredGender as string)) {
      return { isValid: false, error: 'Invalid preferred gender value' };
    }
  }

  // Validate maritalStatus
  if (data.maritalStatus !== undefined) {
    if (!['single', 'divorced', 'widowed', 'annulled'].includes(data.maritalStatus as string)) {
      return { isValid: false, error: 'Invalid marital status' };
    }
  }

  // Validate smoking/drinking preferences
  if (data.smoking !== undefined) {
    if (!['no', 'occasionally', 'yes', ''].includes(data.smoking as string)) {
      return { isValid: false, error: 'Invalid smoking preference' };
    }
  }
  if (data.drinking !== undefined) {
    if (!['no', 'occasionally', 'yes', ''].includes(data.drinking as string)) {
      return { isValid: false, error: 'Invalid drinking preference' };
    }
  }

  // Validate city - supports international Unicode names
  if (data.city !== undefined) {
    if (typeof data.city !== 'string') {
      return { isValid: false, error: 'City must be a string' };
    }
    const trimmed = data.city.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      return { isValid: false, error: 'City must be between 2 and 50 characters' };
    }
    // Unicode letter pattern - supports São Paulo, 北京, Москва, etc.
    if (!/^[\p{L}\s\-'.]+$/u.test(trimmed)) {
      return { isValid: false, error: 'City name contains invalid characters' };
    }
  }

  // Validate aboutMe
  if (data.aboutMe !== undefined) {
    if (typeof data.aboutMe !== 'string') {
      return { isValid: false, error: 'About me must be a string' };
    }
    if (data.aboutMe.length < 20 || data.aboutMe.length > 2000) {
      return { isValid: false, error: 'About me must be between 20 and 2000 characters' };
    }
  }

  // Validate phone number - international support
  if (data.phoneNumber !== undefined && data.phoneNumber !== '') {
    if (typeof data.phoneNumber !== 'string') {
      return { isValid: false, error: 'Phone number must be a string' };
    }
    // Normalize: remove all non-digit characters except leading +
    const normalized = data.phoneNumber.replace(/[^\d+]/g, '');
    const digits = normalized.replace(/\D/g, '');
    // International phone numbers: 10-15 digits
    if (digits.length < 10 || digits.length > 15) {
      return { isValid: false, error: 'Phone number must be between 10 and 15 digits' };
    }
  }

  // Validate partner preference ages
  if (data.partnerPreferenceAgeMin !== undefined) {
    const age = Number(data.partnerPreferenceAgeMin);
    if (isNaN(age) || age < 18 || age > 120) {
      return { isValid: false, error: 'Partner minimum age must be between 18 and 120' };
    }
  }
  if (data.partnerPreferenceAgeMax !== undefined) {
    const age = Number(data.partnerPreferenceAgeMax);
    if (isNaN(age) || age < 18 || age > 120) {
      return { isValid: false, error: 'Partner maximum age must be between 18 and 120' };
    }
  }

  // Validate age range consistency
  if (data.partnerPreferenceAgeMin !== undefined && data.partnerPreferenceAgeMax !== undefined) {
    const minAge = Number(data.partnerPreferenceAgeMin);
    const maxAge = Number(data.partnerPreferenceAgeMax);
    if (minAge > maxAge) {
      return { isValid: false, error: 'Minimum age cannot be greater than maximum age' };
    }
  }

  // Validate cultural fields
  if (data.religion !== undefined) {
    if (typeof data.religion !== 'string') {
      return { isValid: false, error: 'Religion must be a string' };
    }
    if (data.religion.length > 50) {
      return { isValid: false, error: 'Religion must not exceed 50 characters' };
    }
  }

  if (data.motherTongue !== undefined) {
    if (typeof data.motherTongue !== 'string') {
      return { isValid: false, error: 'Mother tongue must be a string' };
    }
    if (data.motherTongue.length > 50) {
      return { isValid: false, error: 'Mother tongue must not exceed 50 characters' };
    }
  }

  if (data.ethnicity !== undefined) {
    if (typeof data.ethnicity !== 'string') {
      return { isValid: false, error: 'Ethnicity must be a string' };
    }
    if (data.ethnicity.length > 50) {
      return { isValid: false, error: 'Ethnicity must not exceed 50 characters' };
    }
  }

  // Validate diet preferences (include 'halal' to match backend/Convex)
  if (data.diet !== undefined) {
    if (!['vegetarian', 'non-vegetarian', 'halal', 'vegan', 'eggetarian', 'other', ''].includes(data.diet as string)) {
      return { isValid: false, error: 'Invalid diet preference' };
    }
  }

  // Validate physical status
  if (data.physicalStatus !== undefined) {
    if (!['normal', 'differently-abled', 'other', ''].includes(data.physicalStatus as string)) {
      return { isValid: false, error: 'Invalid physical status' };
    }
  }

  // Validate height - supports cm and feet/inches formats
  if (data.height !== undefined) {
    if (typeof data.height !== 'string') {
      return { isValid: false, error: 'Height must be a string' };
    }
    
    const heightStr = data.height.trim();
    let heightCm: number | null = null;
    
    // Try to parse as plain number or with "cm" suffix
    const cmMatch = heightStr.match(/^(\d{2,3})\s*(?:cm)?$/i);
    if (cmMatch) {
      heightCm = parseInt(cmMatch[1], 10);
    }
    
    // Try to parse feet/inches format: 5'8", 5'8, 5 ft 8 in
    if (heightCm === null) {
      const feetMatch = heightStr.match(/^([4-7])['′]\s*([0-9]|1[01])(?:["\u2033])?$/i);
      if (feetMatch) {
        const feet = parseInt(feetMatch[1], 10);
        const inches = parseInt(feetMatch[2], 10);
        heightCm = Math.round((feet * 12 + inches) * 2.54);
      }
    }
    
    // Try "5 ft 8 in" format
    if (heightCm === null) {
      const ftInMatch = heightStr.match(/^([4-7])\s*ft\s*([0-9]|1[01])\s*in$/i);
      if (ftInMatch) {
        const feet = parseInt(ftInMatch[1], 10);
        const inches = parseInt(ftInMatch[2], 10);
        heightCm = Math.round((feet * 12 + inches) * 2.54);
      }
    }
    
    if (heightCm === null || isNaN(heightCm) || heightCm < 100 || heightCm > 250) {
      return { isValid: false, error: 'Height must be between 100cm and 250cm (or 4\'0" to 8\'0")' };
    }
  }

  // Validate education and occupation
  if (data.education !== undefined) {
    if (typeof data.education !== 'string') {
      return { isValid: false, error: 'Education must be a string' };
    }
    if (data.education.length > 100) {
      return { isValid: false, error: 'Education must not exceed 100 characters' };
    }
  }

  if (data.occupation !== undefined) {
    if (typeof data.occupation !== 'string') {
      return { isValid: false, error: 'Occupation must be a string' };
    }
    if (data.occupation.length > 100) {
      return { isValid: false, error: 'Occupation must not exceed 100 characters' };
    }
  }

  // Validate annual income
  if (data.annualIncome !== undefined) {
    const income = typeof data.annualIncome === 'string' ? parseInt(data.annualIncome) : data.annualIncome;
    if (typeof income !== 'number' || isNaN(income) || income < 0) {
      return { isValid: false, error: 'Annual income must be a positive number' };
    }
  }

  // Validate subscription plan
  if (data.subscriptionPlan !== undefined) {
    if (!['free', 'premium', 'premiumPlus'].includes(data.subscriptionPlan as string)) {
      return { isValid: false, error: 'Invalid subscription plan' };
    }
  }

  // Validate profileImageIds
  if (data.profileImageIds !== undefined) {
    if (!Array.isArray(data.profileImageIds)) {
      return { isValid: false, error: 'Profile image IDs must be an array' };
    }
    // Validate each ID is a string (Convex storage IDs)
    for (const id of data.profileImageIds) {
      if (typeof id !== 'string') {
        return { isValid: false, error: 'Invalid image ID format' };
      }
    }
  }

  return { isValid: true };
}

/**
 * Sanitizes profile input to prevent XSS and other security issues
 * Enhanced to block:
 * - HTML tags
 * - javascript: URLs
 * - Event handlers (onclick, onerror, etc.)
 * - HTML entity bypass attempts
 */
export function sanitizeProfileInput(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  // Dangerous patterns to remove
  const dangerousPatterns = [
    /<[^>]*>/g, // HTML tags
    /javascript\s*:/gi, // javascript: URLs
    /vbscript\s*:/gi, // vbscript: URLs
    /data\s*:\s*text\/html/gi, // data: URLs with HTML
    /on\w+\s*=/gi, // Event handlers (onclick=, onerror=, onload=, etc.)
    /&lt;/g, // HTML entity <
    /&gt;/g, // HTML entity >
    /&quot;/g, // HTML entity "
    /&#/g, // Numeric HTML entities
    /expression\s*\(/gi, // CSS expression()
  ];
  
  const sanitizeString = (str: string): string => {
    let result = str;
    for (const pattern of dangerousPatterns) {
      result = result.replace(pattern, '');
    }
    // Remove remaining dangerous characters
    result = result.replace(/[<>'"]/g, '');
    return result.trim();
  };
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      continue;
    }
    
    // Sanitize string values
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } 
    // Handle arrays
    else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => {
        if (typeof item === 'string') {
          return sanitizeString(item);
        }
        return item;
      });
    }
    // Handle numbers and booleans
    else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
    // Skip objects and functions
    else if (typeof value !== 'object' && typeof value !== 'function') {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}