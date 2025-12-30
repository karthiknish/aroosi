/**
 * Unified onboarding data models and types for both web and mobile platforms
 * This file provides consistent data structures and validation schemas
 * for profile creation across all platforms.
 * 
 * NOTE: Imports standardized enums from centralized profileSchema
 */

import { z } from "zod";
import {
  PROFILE_CONSTANTS,
  profileSchema,
  PROFILE_FOR_OPTIONS as PROFILE_FOR_ENUM,
  GENDER_OPTIONS as GENDER_ENUM,
  PREFERRED_GENDER_OPTIONS as PREFERRED_GENDER_ENUM,
  MARITAL_STATUS_OPTIONS as MARITAL_STATUS_ENUM,
  SMOKING_OPTIONS as SMOKING_ENUM,
  DRINKING_OPTIONS as DRINKING_ENUM,
  DIET_OPTIONS as DIET_ENUM,
  PHYSICAL_STATUS_OPTIONS as PHYSICAL_STATUS_ENUM,
} from "@/lib/validation/profileSchema";

// Base profile data structure - now strictly uses centralized profileSchema
export const BaseProfileData = profileSchema;

export type ProfileData = z.infer<typeof BaseProfileData>;

// Onboarding step definitions
export const ONBOARDING_STEPS = {
  BASIC_INFO: 1,
  LOCATION: 2,
  PHYSICAL_DETAILS: 3,
  PROFESSIONAL: 4,
  CULTURAL: 5,
  ABOUT_ME: 6,
  LIFESTYLE: 7,
  PHOTOS: 8,
} as const;

export type OnboardingStep =
  (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

// Step validation requirements
export const STEP_VALIDATION_REQUIREMENTS: Record<OnboardingStep, (keyof ProfileData)[]> = {
  [ONBOARDING_STEPS.BASIC_INFO]: [
    "fullName",
    "dateOfBirth",
    "gender",
    "preferredGender",
  ],
  [ONBOARDING_STEPS.LOCATION]: ["country", "city"],
  [ONBOARDING_STEPS.PHYSICAL_DETAILS]: ["height", "maritalStatus"],
  [ONBOARDING_STEPS.PROFESSIONAL]: ["education", "occupation", "annualIncome"],
  [ONBOARDING_STEPS.CULTURAL]: [], // Optional fields
  [ONBOARDING_STEPS.ABOUT_ME]: ["aboutMe", "phoneNumber"],
  [ONBOARDING_STEPS.LIFESTYLE]: [], // Optional fields
  [ONBOARDING_STEPS.PHOTOS]: ["profileImageIds"], // profileImageIds in profileSchema
} as const;

// Validation schema for each step
export const StepValidationSchemas = {
  [ONBOARDING_STEPS.BASIC_INFO]: BaseProfileData.pick({
    fullName: true,
    dateOfBirth: true,
    gender: true,
    preferredGender: true,
  }),

  [ONBOARDING_STEPS.LOCATION]: BaseProfileData.pick({
    country: true,
    city: true,
  }),

  [ONBOARDING_STEPS.PHYSICAL_DETAILS]: BaseProfileData.pick({
    height: true,
    maritalStatus: true,
  }),

  [ONBOARDING_STEPS.PROFESSIONAL]: BaseProfileData.pick({
    education: true,
    occupation: true,
    annualIncome: true,
  }),

  [ONBOARDING_STEPS.CULTURAL]: BaseProfileData.pick({
    religion: true,
    motherTongue: true,
    ethnicity: true,
    profileFor: true,
  }).partial(),

  [ONBOARDING_STEPS.ABOUT_ME]: BaseProfileData.pick({
    aboutMe: true,
    phoneNumber: true,
  }),

  [ONBOARDING_STEPS.LIFESTYLE]: BaseProfileData.pick({
    diet: true,
    smoking: true,
    drinking: true,
    physicalStatus: true,
  }).partial(),

  [ONBOARDING_STEPS.PHOTOS]: BaseProfileData.pick({
    profileImageIds: true,
  }).partial(),
};

// Error types for onboarding
export type OnboardingError = {
  field: string;
  message: string;
  step: OnboardingStep;
};

export type OnboardingValidationError = {
  errors: OnboardingError[];
  step: OnboardingStep;
};

// Progress tracking
export type OnboardingProgress = {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  totalSteps: number;
  isComplete: boolean;
};

// API response types
export type CreateProfileRequest = ProfileData & {
  userId: string;
};

export type CreateProfileResponse = {
  success: boolean;
  profileId: string;
  message?: string;
};

// State management types
export type OnboardingState = {
  data: Partial<ProfileData>;
  errors: Record<string, string>;
  progress: OnboardingProgress;
  isSubmitting: boolean;
};

// Context types
export type OnboardingContextType = {
  state: OnboardingState;
  updateField: (field: keyof ProfileData, value: any) => void;
  validateStep: (step: OnboardingStep) => boolean;
  nextStep: () => void;
  previousStep: () => void;
  submitProfile: () => Promise<CreateProfileResponse>;
  resetOnboarding: () => void;
};

// Utility types
export type FieldValidation = {
  isValid: boolean;
  error?: string;
};

export type StepValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
};

// Constants - re-export from profileSchema for convenience
export { PROFILE_CONSTANTS } from "@/lib/validation/profileSchema";
export const MIN_AGE = PROFILE_CONSTANTS.MIN_AGE;
export const MAX_AGE = PROFILE_CONSTANTS.MAX_AGE;
export const MIN_ABOUT_ME_LENGTH = PROFILE_CONSTANTS.MIN_ABOUT_ME_LENGTH;
export const MAX_ABOUT_ME_LENGTH = PROFILE_CONSTANTS.MAX_ABOUT_ME_LENGTH;
export const MAX_PHOTOS = PROFILE_CONSTANTS.MAX_PHOTOS;

// Gender options - matches GENDER_OPTIONS enum
export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "other", label: "Other" },
] as const;

// Preferred gender - matches PREFERRED_GENDER_OPTIONS enum
export const PREFERRED_GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "any", label: "Any" },
] as const;

// Marital status - matches MARITAL_STATUS_OPTIONS enum
export const MARITAL_STATUS_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "annulled", label: "Annulled" },
] as const;

// Diet options - matches DIET_OPTIONS enum
export const DIET_OPTIONS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "non-vegetarian", label: "Non-vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "other", label: "Other" },
] as const;

// Smoking options - matches SMOKING_OPTIONS enum
export const SMOKING_OPTIONS = [
  { value: "no", label: "No" },
  { value: "occasionally", label: "Occasionally" },
  { value: "yes", label: "Yes" },
] as const;

// Drinking options - matches DRINKING_OPTIONS enum
export const DRINKING_OPTIONS = [
  { value: "no", label: "No" },
  { value: "occasionally", label: "Occasionally" },
  { value: "yes", label: "Yes" },
] as const;

// Keep legacy for backward compatibility
export const SMOKING_DRINKING_OPTIONS = SMOKING_OPTIONS;

// Physical status options - matches PHYSICAL_STATUS_OPTIONS enum
export const PHYSICAL_STATUS_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "differently-abled", label: "Differently Abled" },
  { value: "other", label: "Other" },
] as const;

// Profile for options - matches PROFILE_FOR_OPTIONS enum
export const PROFILE_FOR_OPTIONS = [
  { value: "self", label: "Self" },
  { value: "friend", label: "Friend" },
  { value: "family", label: "Family Member" },
] as const;

import {
  calculateAge as robustCalculateAge,
  deriveDateFromAny,
} from "@/lib/validation/dateValidation";

// Helper functions
export const calculateAge = (dateOfBirth: string): number => {
  const birthDate = deriveDateFromAny(dateOfBirth);
  if (!birthDate) return 0;
  return robustCalculateAge(birthDate);
};

export const formatHeight = (heightCm: number): string => {
  const feet = Math.floor(heightCm / 30.48);
  const inches = Math.round((heightCm % 30.48) / 2.54);
  return `${feet}' ${inches}"`;
};

export const cmToFeetInches = (
  cm: number
): { feet: number; inches: number } => {
  const feet = Math.floor(cm / 30.48);
  const inches = Math.round((cm % 30.48) / 2.54);
  return { feet, inches };
};

export const feetInchesToCm = (feet: number, inches: number): number => {
  return Math.round(feet * 30.48 + inches * 2.54);
};

// Validation helper
export const validateOnboardingData = (
  data: Partial<ProfileData>,
  step: OnboardingStep
): StepValidationResult => {
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
};

// Progress calculation
export const calculateProgress = (
  currentStep: OnboardingStep,
  completedSteps: OnboardingStep[]
): OnboardingProgress => {
  const totalSteps = Object.keys(ONBOARDING_STEPS).length;
  const isComplete = completedSteps.length === totalSteps;

  return {
    currentStep,
    completedSteps,
    totalSteps,
    isComplete,
  };
};
