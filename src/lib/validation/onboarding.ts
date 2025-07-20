/**
 * Unified validation schemas and utilities for onboarding/profile creation
 * Provides consistent validation across web and mobile platforms
 */

import { z } from 'zod';
import {
  BaseProfileData,
  OnboardingStep,
  ONBOARDING_STEPS,
  STEP_VALIDATION_REQUIREMENTS,
  StepValidationSchemas,
  OnboardingError,
  OnboardingValidationError,
  ProfileData,
} from '../../types/onboarding';

// Enhanced validation schemas with custom error messages
export const EnhancedValidationSchemas = {
  // Basic info validation
  basicInfo: z.object({
    fullName: z
      .string()
      .min(2, 'Full name must be at least 2 characters')
      .max(50, 'Full name must be less than 50 characters')
      .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes'),
    
    dateOfBirth: z
      .string()
      .refine(
        (date) => {
          const birthDate = new Date(date);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return age - 1 >= 18;
          }
          return age >= 18;
        },
        { message: 'You must be at least 18 years old' }
      )
      .refine(
        (date) => {
          const birthDate = new Date(date);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          return age <= 120;
        },
        { message: 'Please enter a valid date of birth' }
      ),
    
    gender: z.enum(['male', 'female', 'other'], {
      errorMap: () => ({ message: 'Please select a gender' }),
    }),
    
    preferredGender: z.enum(['male', 'female', 'both', 'other'], {
      errorMap: () => ({ message: 'Please select your preference' }),
    }),
  }),

  // Location validation
  location: z.object({
    country: z
      .string()
      .min(2, 'Country is required')
      .max(50, 'Country name is too long'),
    
    city: z
      .string()
      .min(2, 'City is required')
      .max(50, 'City name is too long')
      .regex(/^[a-zA-Z\s'-]+$/, 'City name can only contain letters, spaces, hyphens, and apostrophes'),
  }),

  // Physical details validation
  physicalDetails: z.object({
    height: z
      .number()
      .min(100, 'Height must be at least 100 cm')
      .max(250, 'Height must be less than 250 cm')
      .optional(),
    
    maritalStatus: z.enum(['single', 'divorced', 'widowed', 'separated'], {
      errorMap: () => ({ message: 'Please select your marital status' }),
    }),
  }),

  // Professional validation
  professional: z.object({
    education: z
      .string()
      .min(2, 'Education is required')
      .max(100, 'Education description is too long'),
    
    occupation: z
      .string()
      .min(2, 'Occupation is required')
      .max(100, 'Occupation description is too long'),
    
    annualIncome: z
      .number()
      .min(0, 'Annual income must be positive')
      .max(999999999, 'Please enter a valid annual income')
      .optional(),
  }),

  // About me validation
  aboutMe: z.object({
    aboutMe: z
      .string()
      .min(50, 'About me must be at least 50 characters')
      .max(2000, 'About me must be less than 2000 characters')
      .refine(
        (text) => text.trim().split(/\s+/).length >= 10,
        { message: 'About me must contain at least 10 words' }
      ),
    
    phoneNumber: z
      .string()
      .regex(
        /^[\+]?[1-9][\d]{0,15}$/,
        'Please enter a valid phone number (e.g., +1234567890)'
      )
      .refine(
        (phone) => phone.replace(/\D/g, '').length >= 10,
        { message: 'Phone number must be at least 10 digits' }
      ),
  }),

  // Photos validation
  photos: z.object({
    photos: z
      .array(z.string().url('Invalid photo URL'))
      .max(5, 'You can upload a maximum of 5 photos')
      .optional(),
  }),

  // Lifestyle validation (all optional)
  lifestyle: z.object({
    diet: z.enum(['vegetarian', 'non-vegetarian', 'vegan', 'halal', 'kosher']).optional(),
    smoking: z.enum(['never', 'occasionally', 'regularly', 'socially']).optional(),
    drinking: z.enum(['never', 'occasionally', 'socially', 'regularly']).optional(),
    physicalStatus: z.enum(['normal', 'physically-challenged']).optional(),
  }),

  // Cultural validation (all optional)
  cultural: z.object({
    religion: z.string().max(50, 'Religion name is too long').optional(),
    motherTongue: z.string().max(50, 'Mother tongue name is too long').optional(),
    ethnicity: z.string().max(50, 'Ethnicity name is too long').optional(),
    profileFor: z.enum(['self', 'friend', 'family']).default('self'),
  }),
};

// Validation utilities
export class OnboardingValidator {
  /**
   * Validate a specific step in the onboarding process
   */
  static validateStep(
    step: OnboardingStep,
    data: Partial<ProfileData>
  ): { isValid: boolean; errors: Record<string, string> } {
    const schema = StepValidationSchemas[step];
    const result = schema.safeParse(data);
    
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((error) => {
        if (error.path[0]) {
          errors[error.path[0].toString()] = error.message;
        }
      });
      return { isValid: false, errors };
    }
    
    return { isValid: true, errors: {} };
  }

  /**
   * Validate all required fields for profile creation
   */
  static validateCompleteProfile(
    data: Partial<ProfileData>
  ): { isValid: boolean; errors: Record<string, string> } {
    const requiredFields = [
      'fullName',
      'dateOfBirth',
      'gender',
      'preferredGender',
      'country',
      'city',
      'maritalStatus',
      'education',
      'occupation',
      'aboutMe',
      'phoneNumber',
    ];
    
    const errors: Record<string, string> = {};
    let isValid = true;
    
    requiredFields.forEach((field) => {
      const fieldSchema = BaseProfileData.shape[field as keyof ProfileData];
      if (fieldSchema) {
        const result = fieldSchema.safeParse(data[field as keyof ProfileData]);
        if (!result.success) {
          errors[field] = result.error.errors[0]?.message || 'Invalid value';
          isValid = false;
        }
      }
    });
    
    return { isValid, errors };
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleaned = phone.replace(/\D/g, '');
    
    if (!phoneRegex.test(phone)) {
      return { isValid: false, error: 'Invalid phone number format' };
    }
    
    if (cleaned.length < 10) {
      return { isValid: false, error: 'Phone number must be at least 10 digits' };
    }
    
    if (cleaned.length > 15) {
      return { isValid: false, error: 'Phone number is too long' };
    }
    
    return { isValid: true };
  }

  /**
   * Validate date of birth for age requirements
   */
  static validateDateOfBirth(date: string): { isValid: boolean; error?: string } {
    try {
      const birthDate = new Date(date);
      const today = new Date();
      
      if (isNaN(birthDate.getTime())) {
        return { isValid: false, error: 'Invalid date format' };
      }
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        return { isValid: false, error: 'You must be at least 18 years old' };
      }
      
      if (age > 120) {
        return { isValid: false, error: 'Please enter a valid date of birth' };
      }
      
      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Invalid date format' };
    }
  }

  /**
   * Validate height in cm
   */
  static validateHeight(height: number): { isValid: boolean; error?: string } {
    if (isNaN(height)) {
      return { isValid: false, error: 'Height must be a number' };
    }
    
    if (height < 100) {
      return { isValid: false, error: 'Height must be at least 100 cm' };
    }
    
    if (height > 250) {
      return { isValid: false, error: 'Height must be less than 250 cm' };
    }
    
    return { isValid: true };
  }

  /**
   * Validate photo URLs
   */
  static validatePhotos(photos: string[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (photos.length > 5) {
      errors.push('You can upload a maximum of 5 photos');
    }
    
    photos.forEach((photo, index) => {
      try {
        new URL(photo);
      } catch {
        errors.push(`Photo ${index + 1} has an invalid URL`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get validation errors for a specific field
   */
  static getFieldError(
    field: keyof ProfileData,
    value: any
  ): string | undefined {
    try {
      const fieldSchema = BaseProfileData.shape[field];
      if (fieldSchema) {
        fieldSchema.parse(value);
      }
      return undefined;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message;
      }
      return 'Invalid value';
    }
  }

  /**
   * Sanitize and clean input data
   */
  static sanitizeInput<T extends Record<string, any>>(data: T): T {
    const sanitized = { ...data } as Record<string, any>;

    Object.keys(sanitized).forEach((key) => {
      const value = sanitized[key];

      // Trim string values
      if (typeof value === "string") {
        sanitized[key] = value.trim();
      }

      // Remove empty strings
      if (value === "") {
        delete sanitized[key];
      }

      // Sanitize phone numbers
      if (key === "phoneNumber" && typeof value === "string") {
        sanitized[key] = value.replace(/\D/g, "");
      }
    });
    
    return sanitized as T;
  }
}