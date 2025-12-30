/**
 * Unified validation schemas and utilities for onboarding/profile creation
 * Provides consistent validation across web and mobile platforms
 */

import { z } from "zod";
import {
  BaseProfileData,
  OnboardingStep,
  StepValidationSchemas,
  ProfileData,
} from "../../types/onboarding";
import { validateDateOfBirth } from "./dateValidation";
import { validateHeight, HEIGHT_CONSTANTS } from "./heightValidation";

import { 
  stepSchemas 
} from "@/lib/validation/profileSchema";

// Re-map stepSchemas to onboarding steps for backward compatibility if needed, 
// or simply use them in OnboardingValidator.
export const EnhancedValidationSchemas = {
  basicInfo: stepSchemas.basicInfo,
  location: stepSchemas.location,
  physicalDetails: stepSchemas.location, // location schema contains height/maritalStatus in profileSchema.ts re-export
  professional: stepSchemas.professional,
  aboutMe: stepSchemas.aboutMe,
  photos: stepSchemas.photos,
  lifestyle: stepSchemas.lifestyle,
  cultural: stepSchemas.cultural,
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
  static validateCompleteProfile(data: Partial<ProfileData>): {
    isValid: boolean;
    errors: Record<string, string>;
  } {
    const requiredFields = [
      "fullName",
      "dateOfBirth",
      "gender",
      "preferredGender",
      "country",
      "city",
      "maritalStatus",
      "education",
      "occupation",
      "aboutMe",
      "phoneNumber",
    ];

    const errors: Record<string, string> = {};
    let isValid = true;

    requiredFields.forEach((field) => {
      const fieldSchema = BaseProfileData.shape[field as keyof ProfileData];
      if (fieldSchema) {
        const result = fieldSchema.safeParse(data[field as keyof ProfileData]);
        if (!result.success) {
          errors[field] = result.error.errors[0]?.message || "Invalid value";
          isValid = false;
        }
      }
    });

    return { isValid, errors };
  }

  /**
   * Validate phone number format
   * Uses same validation as profileSchema: 10-15 digits, international format
   */
  static validatePhoneNumber(phone: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!phone) {
      return { isValid: false, error: "Phone number is required" };
    }

    const digits = phone.replace(/\D/g, "");

    if (digits.length < 10) {
      return {
        isValid: false,
        error: "Phone number must be at least 10 digits",
      };
    }

    if (digits.length > 15) {
      return { isValid: false, error: "Phone number is too long" };
    }

    return { isValid: true };
  }

  /**
   * Validate date of birth for age requirements
   */
  static validateDateOfBirth(date: string): {
    isValid: boolean;
    error?: string;
  } {
    return validateDateOfBirth(date);
  }

  /**
   * Validate height in cm
   */
  static validateHeight(height: any): { isValid: boolean; error?: string } {
    if (validateHeight(height)) {
      return { isValid: true };
    }

    return { 
      isValid: false, 
      error: `Height must be between ${HEIGHT_CONSTANTS.MIN_CM} and ${HEIGHT_CONSTANTS.MAX_CM} cm` 
    };
  }

  /**
   * Validate photo URLs
   */
  static validatePhotos(photos: string[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (photos.length > 5) {
      errors.push("You can upload a maximum of 5 photos");
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
      return "Invalid value";
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
