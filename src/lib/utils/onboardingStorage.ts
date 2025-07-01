/**
 * Centralized localStorage management for onboarding flow
 */

export const STORAGE_KEYS = {
  HERO_ONBOARDING: "heroOnboardingState",
  PROFILE_CREATION: "profileCreationWizardState",
  PENDING_IMAGES: "pendingProfileImages",
} as const;

/**
 * Migrate data from HeroOnboarding to ProfileCreationModal
 */
export function migrateHeroDataToProfile(): void {
  if (typeof window === "undefined") return;

  try {
    const heroData = localStorage.getItem(STORAGE_KEYS.HERO_ONBOARDING);
    if (!heroData) return;

    const parsed = JSON.parse(heroData);

    // Get existing profile data or create new
    const existingProfileData = localStorage.getItem(
      STORAGE_KEYS.PROFILE_CREATION,
    );
    const profileState = existingProfileData
      ? JSON.parse(existingProfileData)
      : { step: 1, formData: {} };

    // Merge hero data into profile data
    profileState.formData = {
      ...profileState.formData,
      ...parsed.formData,
    };

    // Save updated profile data
    localStorage.setItem(
      STORAGE_KEYS.PROFILE_CREATION,
      JSON.stringify(profileState),
    );

    // Clear hero data after migration
    localStorage.removeItem(STORAGE_KEYS.HERO_ONBOARDING);
  } catch (error) {
    console.warn("Failed to migrate hero onboarding data:", error);
  }
}

/**
 * Clear all onboarding-related localStorage data
 */
export function clearAllOnboardingData(): void {
  if (typeof window === "undefined") return;

  Object.values(STORAGE_KEYS).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  });
}
