/**
 * Centralized Profile Schema
 * 
 * This is the single source of truth for all profile field definitions.
 * All other schemas (onboarding, form, API) should derive from this base.
 * 
 * @module lib/validation/profileSchema
 */

import { z } from "zod";
import { validateDateOfBirth } from "./dateValidation";

// ============================================================================
// Constants
// ============================================================================

export const PROFILE_CONSTANTS = {
  MIN_AGE: 18,
  MAX_AGE: 120,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_ABOUT_ME_LENGTH: 10,
  MAX_ABOUT_ME_LENGTH: 2000,
  MAX_CITY_LENGTH: 50,
  MAX_EDUCATION_LENGTH: 100,
  MAX_OCCUPATION_LENGTH: 100,
  MAX_PHOTOS: 6,
  MAX_PARTNER_CITIES: 10,
} as const;

// ============================================================================
// Enum Definitions (Single Source of Truth)
// ============================================================================

export const PROFILE_FOR_OPTIONS = ["self", "friend", "family"] as const;
export const GENDER_OPTIONS = ["male", "female", "non-binary", "other"] as const;
export const PREFERRED_GENDER_OPTIONS = ["male", "female", "non-binary", "other", "any"] as const;
export const MARITAL_STATUS_OPTIONS = ["single", "divorced", "widowed", "annulled"] as const;
export const SMOKING_OPTIONS = ["no", "occasionally", "yes"] as const;
export const DRINKING_OPTIONS = ["no", "occasionally", "yes"] as const;
export const DIET_OPTIONS = ["vegetarian", "non-vegetarian", "vegan", "halal", "eggetarian", "other"] as const;
export const PHYSICAL_STATUS_OPTIONS = ["normal", "differently-abled", "other"] as const;
export const SUBSCRIPTION_PLAN_OPTIONS = ["free", "premium", "premiumPlus"] as const;

// ============================================================================
// Base Field Schemas (Reusable Building Blocks)
// ============================================================================

/** Unicode-aware name validation */
export const nameSchema = z
  .string()
  .trim()
  .min(PROFILE_CONSTANTS.MIN_NAME_LENGTH, `Name must be at least ${PROFILE_CONSTANTS.MIN_NAME_LENGTH} characters`)
  .max(PROFILE_CONSTANTS.MAX_NAME_LENGTH, `Name must be less than ${PROFILE_CONSTANTS.MAX_NAME_LENGTH} characters`)
  .regex(/^[\p{L}\s\-'.]+$/u, "Name can only contain letters, spaces, hyphens, apostrophes, and periods")
  .refine((name) => /\p{L}/u.test(name), "Name must contain at least one letter")
  .refine((name) => !/[\-'.]{2,}/.test(name), "Name cannot have consecutive special characters");

/** Date of birth with robust validation */
export const dateOfBirthSchema = z
  .string()
  .refine(
    (date) => validateDateOfBirth(date).isValid,
    (date) => ({ message: validateDateOfBirth(date).error || "Invalid date of birth" })
  );

/** Unicode-aware city validation */
export const citySchema = z
  .string()
  .trim()
  .min(2, "City is required")
  .max(PROFILE_CONSTANTS.MAX_CITY_LENGTH, `City must be less than ${PROFILE_CONSTANTS.MAX_CITY_LENGTH} characters`)
  .regex(/^[\p{L}\s\-'.]+$/u, "City name can only contain letters, spaces, hyphens, apostrophes, and periods");

/** International phone number (10-15 digits) */
export const phoneNumberSchema = z
  .string()
  .refine(
    (phone) => {
      if (!phone) return true;
      const digits = phone.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15;
    },
    "Phone number must be between 10 and 15 digits"
  );

/** Height in various formats (cm, feet/inches) */
export const heightSchema = z
  .string()
  .refine((val) => {
    if (!val) return true;
    const trimmed = val.trim();
    // Allow cm format
    if (/^\d{2,3}\s*(?:cm)?$/i.test(trimmed)) {
      const cm = parseInt(trimmed);
      return cm >= 100 && cm <= 250;
    }
    // Allow feet/inches format
    if (/^[4-7]['′]\s*([0-9]|1[01])(?:["″])?$/i.test(trimmed)) {
      return true;
    }
    return false;
  }, "Enter height as \"170 cm\" or \"5'8\"");

/** Annual income - no negatives */
export const annualIncomeSchema = z
  .string()
  .refine(
    (val) => {
      if (!val) return true;
      if (val.includes("-")) return false;
      if (!/\d/.test(val)) return false;
      return /^(?:[^\d\s-])?\s*(?:\d{1,3}(?:,\d{2,3})+|\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(val);
    },
    "Enter a positive amount with optional currency symbol"
  )
  .optional();

/** About me with length requirements */
export const aboutMeSchema = z
  .string()
  .trim()
  .min(PROFILE_CONSTANTS.MIN_ABOUT_ME_LENGTH, `About me must be at least ${PROFILE_CONSTANTS.MIN_ABOUT_ME_LENGTH} characters`)
  .max(PROFILE_CONSTANTS.MAX_ABOUT_ME_LENGTH, `About me must be less than ${PROFILE_CONSTANTS.MAX_ABOUT_ME_LENGTH} characters`);

/** Partner preference cities - filters empty, limits count */
export const partnerPreferenceCitySchema = z
  .array(z.string())
  .transform((arr) => arr.filter((s) => s.trim().length >= 2))
  .refine((arr) => arr.length <= PROFILE_CONSTANTS.MAX_PARTNER_CITIES, `Maximum ${PROFILE_CONSTANTS.MAX_PARTNER_CITIES} preferred cities allowed`)
  .optional();

/** Email with strict validation */
export const emailSchema = z
  .string()
  .refine(
    (val) => {
      if (!val) return true;
      if (/\.\./.test(val)) return false;
      if (/@\./.test(val)) return false;
      if (/\.@/.test(val)) return false;
      return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val);
    },
    "Please enter a valid email address"
  );

// ============================================================================
// Complete Profile Schema (All Fields)
// ============================================================================

/**
 * Complete profile schema with all fields.
 * This is the base from which all other schemas should be derived.
 */
export const profileSchema = z.object({
  // Identity
  profileFor: z.enum(PROFILE_FOR_OPTIONS).optional(),
  
  // Basic Information
  fullName: nameSchema,
  dateOfBirth: dateOfBirthSchema,
  gender: z.enum(GENDER_OPTIONS),
  preferredGender: z.enum(PREFERRED_GENDER_OPTIONS).optional(),
  
  // Location
  city: citySchema,
  country: z.string().trim().optional(),
  
  // Physical
  height: heightSchema.optional(),
  maritalStatus: z.enum(MARITAL_STATUS_OPTIONS).optional(),
  physicalStatus: z.enum(PHYSICAL_STATUS_OPTIONS).optional(),
  
  // Professional
  education: z.string().max(PROFILE_CONSTANTS.MAX_EDUCATION_LENGTH).optional(),
  occupation: z.string().max(PROFILE_CONSTANTS.MAX_OCCUPATION_LENGTH).optional(),
  annualIncome: annualIncomeSchema,
  
  // About
  aboutMe: aboutMeSchema.optional(),
  phoneNumber: phoneNumberSchema.optional(),
  
  // Cultural
  religion: z.string().max(50).optional(),
  motherTongue: z.string().max(50).optional(),
  ethnicity: z.string().max(50).optional(),
  
  // Lifestyle
  diet: z.enum(DIET_OPTIONS).optional(),
  smoking: z.enum(SMOKING_OPTIONS).optional(),
  drinking: z.enum(DRINKING_OPTIONS).optional(),
  
  // Partner Preferences
  partnerPreferenceAgeMin: z.number().min(18).max(99).optional(),
  partnerPreferenceAgeMax: z.number().min(18).max(99).optional(),
  partnerPreferenceCity: partnerPreferenceCitySchema,
  
  // Photos
  profileImageIds: z.array(z.string()).optional(),
  
  // Account
  email: emailSchema.optional(),
  subscriptionPlan: z.enum(SUBSCRIPTION_PLAN_OPTIONS).optional(),
  isProfileComplete: z.boolean().optional(),
  hideFromFreeUsers: z.boolean().optional(),
});

// ============================================================================
// Derived Schemas
// ============================================================================

/** Schema for creating a new profile (required fields enforced) */
export const createProfileSchema = profileSchema
  .required({
    fullName: true,
    dateOfBirth: true,
    gender: true,
    city: true,
  })
  .refine(
    (data) => {
      if (data.partnerPreferenceAgeMin && data.partnerPreferenceAgeMax) {
        return data.partnerPreferenceAgeMin <= data.partnerPreferenceAgeMax;
      }
      return true;
    },
    {
      message: "Minimum age cannot be greater than maximum age",
      path: ["partnerPreferenceAgeMin"],
    }
  );

/** Schema for updating a profile (all fields optional) */
export const updateProfileSchema = profileSchema.partial().refine(
  (data) => {
    if (data.partnerPreferenceAgeMin && data.partnerPreferenceAgeMax) {
      return data.partnerPreferenceAgeMin <= data.partnerPreferenceAgeMax;
    }
    return true;
  },
  {
    message: "Minimum age cannot be greater than maximum age",
    path: ["partnerPreferenceAgeMin"],
  }
);

// ============================================================================
// Step-Based Schemas (for Onboarding)
// ============================================================================

export const stepSchemas = {
  basicInfo: profileSchema.pick({
    profileFor: true,
    fullName: true,
    dateOfBirth: true,
    gender: true,
    preferredGender: true,
    phoneNumber: true,
  }),
  
  location: profileSchema.pick({
    city: true,
    country: true,
    height: true,
    maritalStatus: true,
  }),
  
  professional: profileSchema.pick({
    education: true,
    occupation: true,
    annualIncome: true,
  }),
  
  cultural: profileSchema.pick({
    religion: true,
    motherTongue: true,
    ethnicity: true,
  }),
  
  lifestyle: profileSchema.pick({
    diet: true,
    smoking: true,
    drinking: true,
    physicalStatus: true,
  }),
  
  aboutMe: profileSchema.pick({
    aboutMe: true,
  }),
  
  preferences: profileSchema.pick({
    preferredGender: true,
    partnerPreferenceAgeMin: true,
    partnerPreferenceAgeMax: true,
    partnerPreferenceCity: true,
  }),
  
  photos: profileSchema.pick({
    profileImageIds: true,
  }),
  
  account: profileSchema.pick({
    email: true,
  }),
};

// ============================================================================
// Type Exports
// ============================================================================

export type ProfileData = z.infer<typeof profileSchema>;
export type CreateProfileData = z.infer<typeof createProfileSchema>;
export type UpdateProfileData = z.infer<typeof updateProfileSchema>;
export type ProfileFor = (typeof PROFILE_FOR_OPTIONS)[number];
export type Gender = (typeof GENDER_OPTIONS)[number];
export type PreferredGender = (typeof PREFERRED_GENDER_OPTIONS)[number];
export type MaritalStatus = (typeof MARITAL_STATUS_OPTIONS)[number];
export type Diet = (typeof DIET_OPTIONS)[number];
export type SmokingStatus = (typeof SMOKING_OPTIONS)[number];
export type DrinkingStatus = (typeof DRINKING_OPTIONS)[number];
export type PhysicalStatus = (typeof PHYSICAL_STATUS_OPTIONS)[number];
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLAN_OPTIONS)[number];
