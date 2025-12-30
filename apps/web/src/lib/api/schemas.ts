import { z } from "zod";
import {
  profileSchema,
  createProfileSchema,
  PROFILE_CONSTANTS,
  PREFERRED_GENDER_OPTIONS,
} from "@/lib/validation/profileSchema";

// ============================================================================
// Profile Schemas (Re-exported from centralized source)
// ============================================================================

export { profileSchema, createProfileSchema };

/** @deprecated Use profileSchema from @/lib/validation/profileSchema */
export const profileBaseSchema = profileSchema.partial();

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
