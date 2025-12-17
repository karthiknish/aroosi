import { z } from "zod";

export const profileBaseSchema = z.object({
  fullName: z.string().min(2).max(100).regex(/^[a-zA-Z\s'-]+$/, "Full name contains invalid characters").optional(),
  dateOfBirth: z.string().refine((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) return false;
    const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    return age >= 18 && age <= 120;
  }, "Age must be between 18 and 120").optional(),
  gender: z.enum(["male", "female", "non-binary", "other"]).optional(),
  preferredGender: z.enum(["male", "female", "non-binary", "other", "any", ""]).optional(),
  maritalStatus: z.enum(["single", "divorced", "widowed", "annulled"]).optional(),
  smoking: z.enum(["no", "occasionally", "yes", ""]).optional(),
  drinking: z.enum(["no", "occasionally", "yes", ""]).optional(),
  city: z.string().min(2).max(50).optional(),
  country: z.string().optional(),
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
    const heightCm = parseInt(val);
    return !isNaN(heightCm) && heightCm >= 137 && heightCm <= 198;
  }, "Height must be between 137cm and 198cm").optional(),
  education: z.string().max(100).optional(),
  occupation: z.string().max(100).optional(),
  annualIncome: z.union([z.number(), z.string()]).transform((val) => {
    if (typeof val === "string") {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return val;
  }).optional(),
  subscriptionPlan: z.enum(["free", "premium", "premiumPlus"]).optional(),
  profileImageIds: z.array(z.string()).optional(),
  isProfileComplete: z.boolean().optional(),
  profileFor: z.enum(["self", "son", "daughter", "brother", "sister", "friend", "relative", ""]).optional(),
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
  gender: z.enum(["male", "female", "non-binary", "other"]),
  city: z.string().min(2).max(50),
  aboutMe: z.string().min(20).max(2000),
  occupation: z.string().max(100),
  education: z.string().max(100),
  height: z.string(),
  maritalStatus: z.enum(["single", "divorced", "widowed", "annulled"]),
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
