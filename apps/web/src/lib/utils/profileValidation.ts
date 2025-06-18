
interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates profile data for security and correctness
 */
export function validateProfileData(data: Record<string, unknown>): ValidationResult {
  // Validate fullName
  if (data.fullName !== undefined) {
    if (typeof data.fullName !== 'string') {
      return { isValid: false, error: 'Full name must be a string' };
    }
    if (data.fullName.length < 2 || data.fullName.length > 100) {
      return { isValid: false, error: 'Full name must be between 2 and 100 characters' };
    }
    if (!/^[a-zA-Z\s'-]+$/.test(data.fullName)) {
      return { isValid: false, error: 'Full name contains invalid characters' };
    }
  }

  // Validate dateOfBirth
  if (data.dateOfBirth !== undefined) {
    if (typeof data.dateOfBirth !== 'string') {
      return { isValid: false, error: 'Date of birth must be a string' };
    }
    const date = new Date(data.dateOfBirth);
    if (isNaN(date.getTime())) {
      return { isValid: false, error: 'Invalid date of birth' };
    }
    const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 18 || age > 120) {
      return { isValid: false, error: 'Age must be between 18 and 120' };
    }
  }

  // Validate gender
  if (data.gender !== undefined) {
    if (!['male', 'female', 'other'].includes(data.gender as string)) {
      return { isValid: false, error: 'Invalid gender value' };
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
    if (!['no', 'occasionally', 'yes'].includes(data.drinking as string)) {
      return { isValid: false, error: 'Invalid drinking preference' };
    }
  }

  // Validate UK city
  if (data.ukCity !== undefined) {
    if (typeof data.ukCity !== 'string') {
      return { isValid: false, error: 'UK city must be a string' };
    }
    if (data.ukCity.length < 2 || data.ukCity.length > 50) {
      return { isValid: false, error: 'UK city must be between 2 and 50 characters' };
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

  // Validate phone number
  if (data.phoneNumber !== undefined && data.phoneNumber !== '') {
    if (typeof data.phoneNumber !== 'string') {
      return { isValid: false, error: 'Phone number must be a string' };
    }
    // Basic UK phone number validation
    if (!/^(\+44|0)[0-9]{10,11}$/.test(data.phoneNumber.replace(/\s/g, ''))) {
      return { isValid: false, error: 'Invalid UK phone number format' };
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
 */
export function sanitizeProfileInput(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      continue;
    }
    
    // Sanitize string values
    if (typeof value === 'string') {
      // Remove any HTML tags and dangerous characters
      sanitized[key] = value
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>'"]/g, '') // Remove dangerous characters
        .trim();
    } 
    // Handle arrays
    else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => {
        if (typeof item === 'string') {
          return item.replace(/<[^>]*>/g, '').replace(/[<>'"]/g, '').trim();
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