import { z } from "zod";
import {
  PROFILE_FOR_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  SMOKING_OPTIONS,
  DRINKING_OPTIONS,
  DIET_OPTIONS,
  PHYSICAL_STATUS_OPTIONS,
  SUBSCRIPTION_PLAN_OPTIONS,
} from "@/lib/validation/profileSchema";

// ============================================================================
// Profile Base Schema (with backwards-compatible empty string support)
// ============================================================================

export const profileBaseSchema = z.object({
  fullName: z.string().trim().min(2).max(100).regex(/^[\p{L}\s\-'.]+$/u, "Full name contains invalid characters").optional(),
  dateOfBirth: z.string().refine((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) return false;
    const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 18 && age <= 120;
  }, "Age must be between 18 and 120").optional(),
  gender: z.enum([...GENDER_OPTIONS]).optional(),
  preferredGender: z.enum(["male", "female", "non-binary", "other", "any", ""]).optional(),
  maritalStatus: z.enum([...MARITAL_STATUS_OPTIONS]).optional(),
  smoking: z.enum(["no", "occasionally", "yes", ""]).optional(),
  drinking: z.enum(["no", "occasionally", "yes", ""]).optional(),
  city: z.string().trim().min(2).max(50).optional(),
  country: z.string().trim().optional(),
  aboutMe: z.string().min(20).max(2000).optional(),
  phoneNumber: z.string().regex(/^[+]?[\d\s-]{7,20}$/, "Invalid phone number format").optional().or(z.literal("")),
  partnerPreferenceAgeMin: z.coerce.number().int().min(18).max(120).optional(),
  partnerPreferenceAgeMax: z.coerce.number().int().min(18).max(120).optional(),
  religion: z.string().max(50).optional(),
  motherTongue: z.string().max(50).optional(),
  ethnicity: z.string().max(50).optional(),
  diet: z.enum(["vegetarian", "non-vegetarian", "halal", "vegan", "eggetarian", "other", ""]).optional(),
  physicalStatus: z.enum(["normal", "differently-abled", "other", ""]).optional(),
  height: z.string().refine((val) => {
    if (!val) return true;
    const heightCm = parseInt(val);
    return !isNaN(heightCm) && heightCm >= 100 && heightCm <= 250;
  }, "Height must be between 100cm and 250cm").optional(),
  education: z.string().max(100).optional(),
  occupation: z.string().max(100).optional(),
  annualIncome: z.union([z.number(), z.string()]).transform((val) => {
    if (typeof val === "string") {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return val;
  }).optional(),
  subscriptionPlan: z.enum([...SUBSCRIPTION_PLAN_OPTIONS]).optional(),
  profileImageIds: z.array(z.string()).optional(),
  isProfileComplete: z.boolean().optional(),
  profileFor: z.enum([...PROFILE_FOR_OPTIONS, ""] as const).optional(),
  hideFromFreeUsers: z.boolean().optional(),
});

export const profileSchema = profileBaseSchema.refine((data) => {
  if (data.partnerPreferenceAgeMin !== undefined && data.partnerPreferenceAgeMax !== undefined) {
    return data.partnerPreferenceAgeMin <= data.partnerPreferenceAgeMax;
  }
  return true;
}, {
  message: "Minimum age cannot be greater than maximum age",
  path: ["partnerPreferenceAgeMin"],
});

export const createProfileSchema = profileBaseSchema.extend({
  fullName: z.string().min(2).max(100),
  dateOfBirth: z.string(),
  gender: z.enum([...GENDER_OPTIONS]),
  city: z.string().min(2).max(50),
  aboutMe: z.string().min(20).max(2000),
  occupation: z.string().max(100),
  education: z.string().max(100),
  height: z.string(),
  maritalStatus: z.enum([...MARITAL_STATUS_OPTIONS]),
  phoneNumber: z.string().regex(/^[+]?[\d\s-]{7,20}$/, "Invalid phone number format"),
}).refine((data) => {
  if (data.partnerPreferenceAgeMin !== undefined && data.partnerPreferenceAgeMax !== undefined) {
    return data.partnerPreferenceAgeMin <= data.partnerPreferenceAgeMax;
  }
  return true;
}, {
  message: "Minimum age cannot be greater than maximum age",
  path: ["partnerPreferenceAgeMin"],
});

// ============================================================================
// Search Schema
// ============================================================================

// Sanitized bounded string: trims, strips risky chars, 2..50
const SanStr = z
  .string()
  .trim()
  .transform((v: string) => v.replace(/[<>'"&]/g, ""))
  .pipe(z.string().min(2).max(50));

export const searchSchema = z.object({
  city: SanStr.optional(),
  country: SanStr.optional(),
  ethnicity: SanStr.optional(),
  motherTongue: SanStr.optional(),
  language: SanStr.optional(),
  preferredGender: z.enum(["any", "male", "female", "non-binary", "other"]).optional(),
  ageMin: z.coerce.number().int().min(18).max(120).optional(),
  ageMax: z.coerce.number().int().min(18).max(120).optional(),
  page: z.coerce.number().int().min(0).max(100).default(0),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  cursor: z.string().min(1).max(200).optional(), // base64 or 'createdAt|id'
});

// ============================================================================
// Image Metadata Schemas
// ============================================================================

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"] as const;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const imageMetadataSchema = z.object({
  storageId: z.string().min(1, "storageId is required"),
  fileName: z.string().min(1, "fileName is required"),
  contentType: z.enum(ALLOWED_IMAGE_TYPES, { 
    errorMap: () => ({ message: "Unsupported image type. Allowed: JPEG, PNG, WebP" }) 
  }),
  size: z.number().max(MAX_IMAGE_SIZE_BYTES, "File too large (max 5MB)").optional(),
  fileSize: z.number().max(MAX_IMAGE_SIZE_BYTES).optional(), // legacy support
}).refine(
  (data) => typeof data.size === "number" || typeof data.fileSize === "number",
  { message: "size or fileSize is required" }
);

export const deleteImageSchema = z.object({
  storageId: z.string().optional(),
  imageId: z.string().optional(), // legacy support
}).refine(
  (data) => data.storageId || data.imageId,
  { message: "storageId or imageId is required" }
);

// ============================================================================
// User Identification Schemas
// ============================================================================

export const userIdQuerySchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

export const profileIdBodySchema = z.object({
  profileId: z.string().min(1, "profileId is required"),
});

export const toUserIdBodySchema = z.object({
  toUserId: z.string().min(1, "toUserId is required"),
});

// Export ALLOWED_IMAGE_TYPES for use in routes
export { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES };
