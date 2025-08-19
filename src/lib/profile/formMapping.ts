import type { Profile, ProfileFormValues } from "@/types/profile";

type Gender = "male" | "female" | "non-binary" | "prefer-not-to-say" | "other";

/**
 * Convert a full Profile record from the API/database into the shape expected by
 * our React-Hook-Form profile forms (all fields are strings / numbers and many
 * become optional). This logic was previously embedded in the legacy
 * `ProfileForm` component and is kept here so that both the wizard and simple
 * editor can share it.
 */
export function mapProfileToFormValues(
  profile: Profile | null | undefined,
): Partial<ProfileFormValues> {
  if (!profile || typeof profile !== "object") return {};

  // eslint-disable-next-line no-unused-vars
  const { profileImageUrls: _profileImageUrls, ...p } =
    profile as unknown as Record<string, unknown>;

  return {
    ...p,
    gender: (() => {
      const g = typeof p.gender === "string" ? p.gender.toLowerCase() : "";
      return (
        ["male", "female", "non-binary", "prefer-not-to-say", "other"].includes(
          g
        )
          ? g
          : "other"
      ) as Gender;
    })(),
    // Preserve casing for city to match what the user entered during signup
    city: p.city ? String(p.city) : "",
    partnerPreferenceAgeMin:
      p.partnerPreferenceAgeMin !== undefined &&
      p.partnerPreferenceAgeMin !== null
        ? String(p.partnerPreferenceAgeMin)
        : "",
    partnerPreferenceAgeMax:
      p.partnerPreferenceAgeMax !== undefined &&
      p.partnerPreferenceAgeMax !== null
        ? String(p.partnerPreferenceAgeMax)
        : "",
    partnerPreferenceCity: Array.isArray(p.partnerPreferenceCity)
      ? p.partnerPreferenceCity.join(", ")
      : typeof p.partnerPreferenceCity === "string"
        ? p.partnerPreferenceCity
        : "",
    annualIncome:
      typeof p.annualIncome === "number"
        ? String(p.annualIncome)
        : (p.annualIncome as string) || "",
    height:
      typeof p.height === "number"
        ? String(p.height)
        : (p.height as string) || "",
  } as Partial<ProfileFormValues>;
}
