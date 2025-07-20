/**
 * Unified onboarding data models and types for both web and mobile platforms
 * This file provides consistent data structures and validation schemas
 * for profile creation across all platforms.
 */

import { z } from "zod";

// Base profile data structure
export const BaseProfileData = z.object({
  // Basic Information
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  dateOfBirth: z.string().refine(
    (date) => {
      const age = new Date().getFullYear() - new Date(date).getFullYear();
      return age >= 18 && age <= 120;
    },
    { message: "You must be between 18 and 120 years old" }
  ),
  gender: z.enum(["male", "female", "other"]),
  preferredGender: z.enum(["male", "female", "both", "other"]),

  // Location
  country: z.string().min(2, "Country is required"),
  city: z.string().min(2, "City is required"),

  // Physical Details
  height: z.number().min(100).max(250).optional(),
  maritalStatus: z.enum(["single", "divorced", "widowed", "separated"]),

  // Professional
  education: z.string().min(2, "Education is required"),
  occupation: z.string().min(2, "Occupation is required"),
  annualIncome: z.number().min(0).optional(),

  // Cultural Background
  religion: z.string().optional(),
  motherTongue: z.string().optional(),
  ethnicity: z.string().optional(),
  profileFor: z.enum(["self", "friend", "family"]).default("self"),

  // About Me
  aboutMe: z
    .string()
    .min(50, "About me must be at least 50 characters")
    .max(2000),
  phoneNumber: z
    .string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number"),

  // Lifestyle
  diet: z
    .enum(["vegetarian", "non-vegetarian", "vegan", "halal", "kosher"])
    .optional(),
  smoking: z
    .enum(["never", "occasionally", "regularly", "socially"])
    .optional(),
  drinking: z
    .enum(["never", "occasionally", "socially", "regularly"])
    .optional(),
  physicalStatus: z.enum(["normal", "physically-challenged"]).optional(),

  // Partner Preferences
  partnerPreferenceAgeMin: z.number().min(18).max(120).optional(),
  partnerPreferenceAgeMax: z.number().min(18).max(120).optional(),

  // Photos
  photos: z.array(z.string()).max(5).optional(),
});

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
export const STEP_VALIDATION_REQUIREMENTS = {
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
  [ONBOARDING_STEPS.PHOTOS]: ["photos"], // Optional but recommended
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
    photos: true,
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

// Constants
export const MIN_AGE = 18;
export const MAX_AGE = 120;
export const MIN_ABOUT_ME_LENGTH = 50;
export const MAX_ABOUT_ME_LENGTH = 2000;
export const MAX_PHOTOS = 5;

// Gender options
export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

export const PREFERRED_GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "both", label: "Both" },
  { value: "other", label: "Other" },
] as const;

// Marital status options
export const MARITAL_STATUS_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
] as const;

// Diet options
export const DIET_OPTIONS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "non-vegetarian", label: "Non-vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
] as const;

// Smoking/drinking options
export const SMOKING_DRINKING_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "occasionally", label: "Occasionally" },
  { value: "socially", label: "Socially" },
  { value: "regularly", label: "Regularly" },
] as const;

// Physical status options
export const PHYSICAL_STATUS_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "physically-challenged", label: "Physically Challenged" },
] as const;

// Profile for options
export const PROFILE_FOR_OPTIONS = [
  { value: "self", label: "Self" },
  { value: "friend", label: "Friend" },
  { value: "family", label: "Family Member" },
] as const;

// Helper functions
export const calculateAge = (dateOfBirth: string): number => {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
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
