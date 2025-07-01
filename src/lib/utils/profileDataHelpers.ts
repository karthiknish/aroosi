/**
 * Helper functions for managing profile data between HeroOnboarding and ProfileCreationModal
 */

// Fields that are collected in HeroOnboarding
export const HERO_ONBOARDING_FIELDS = [
  "profileFor",
  "gender",
  "fullName",
  "dateOfBirth",
  "phoneNumber",
] as const;

export type HeroOnboardingFields = (typeof HERO_ONBOARDING_FIELDS)[number];

/**
 * Separates profile data into HeroOnboarding fields and ProfileModal fields
 */
export function separateProfileData<T extends Record<string, unknown>>(
  data: T
): {
  heroFields: Partial<T>;
  modalFields: Partial<T>;
} {
  const heroFields: Partial<T> = {};
  const modalFields: Partial<T> = {};

  Object.entries(data).forEach(([key, value]) => {
    if (HERO_ONBOARDING_FIELDS.includes(key as HeroOnboardingFields)) {
      heroFields[key as keyof T] = value as T[keyof T];
    } else {
      modalFields[key as keyof T] = value as T[keyof T];
    }
  });

  return { heroFields, modalFields };
}

/**
 * Merges data from HeroOnboarding with ProfileModal data
 * HeroOnboarding data takes precedence
 */
export function mergeProfileData<T extends Record<string, unknown>>(
  heroData: Partial<T>,
  modalData: Partial<T>
): T {
  return {
    ...modalData,
    ...heroData,
  } as T;
}
