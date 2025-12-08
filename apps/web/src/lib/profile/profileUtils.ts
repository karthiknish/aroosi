import { Profile } from "@/types/profile";

/**
 * Return true when the profile meets minimum completion requirements.
 * - Handles string vs number fields and arrays safely.
 * - Accepts either profileImageIds (ids) or profileImageUrls (urls) to satisfy images requirement.
 */
export const checkProfileCompletion = (profile: Profile | null | undefined): boolean => {
  if (!profile || typeof profile !== "object") return false;

  // Helper to check non-empty string
  const hasText = (v: unknown) => typeof v === "string" && v.trim().length > 0;

  // Images can be in ids or urls for legacy vs new paths
  const hasImages =
    (Array.isArray(profile.profileImageIds) && profile.profileImageIds.length > 0) ||
    (Array.isArray(profile.profileImageUrls) && profile.profileImageUrls.length > 0);

  // Required textual fields
  const ok =
    hasText(profile.fullName) &&
    hasText(profile.gender) &&
    hasText(profile.dateOfBirth) &&
    hasText(profile.maritalStatus) &&
    hasText(profile.city) &&
    hasText(profile.occupation) &&
    hasText(profile.education) &&
    hasText(profile.aboutMe) &&
    hasImages;

  return ok;
};
