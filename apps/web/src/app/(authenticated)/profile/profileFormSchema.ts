import * as z from "zod";
import { profileSchema, createProfileSchema } from "@/lib/validation/profileSchema";

/**
 * Returns the appropriate validation schema for the profile form.
 * Onboarding requires essential fields, while regular profile updates
 * allow partial updates (all fields optional).
 */
export function getProfileFormSchema(isOnboarding: boolean) {
  if (isOnboarding) return createProfileSchema;
  return profileSchema.partial();
}

export type ProfileFormValues = z.infer<
  ReturnType<typeof getProfileFormSchema>
>;
