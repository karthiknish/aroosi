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

    let parsed: { formData?: Record<string, unknown> };
    try {
      parsed = JSON.parse(heroData);
    } catch (parseError) {
      console.error("Failed to parse hero onboarding data:", parseError);
      // Clear corrupted data
      localStorage.removeItem(STORAGE_KEYS.HERO_ONBOARDING);
      return;
    }

    if (!parsed || typeof parsed !== "object" || !parsed.formData) {
      console.warn("Invalid hero onboarding data structure");
      localStorage.removeItem(STORAGE_KEYS.HERO_ONBOARDING);
      return;
    }

    // Get existing profile data or create new
    let profileState: { step: number; formData: Record<string, unknown> };
    try {
      const existingProfileData = localStorage.getItem(
        STORAGE_KEYS.PROFILE_CREATION
      );
      profileState = existingProfileData
        ? JSON.parse(existingProfileData)
        : { step: 1, formData: {} };
    } catch (parseError) {
      console.error("Failed to parse existing profile data:", parseError);
      profileState = { step: 1, formData: {} };
    }

    // Validate profile state structure
    if (!profileState || typeof profileState !== "object") {
      profileState = { step: 1, formData: {} };
    }
    if (!profileState.formData || typeof profileState.formData !== "object") {
      profileState.formData = {};
    }

    // Merge hero data into profile data
    profileState.formData = {
      ...profileState.formData,
      ...parsed.formData,
    };

    // Save updated profile data
    try {
      localStorage.setItem(
        STORAGE_KEYS.PROFILE_CREATION,
        JSON.stringify(profileState)
      );
    } catch (saveError) {
      console.error("Failed to save migrated profile data:", saveError);
      throw new Error("Failed to save migrated data to localStorage");
    }

    // Clear hero data after successful migration
    try {
      localStorage.removeItem(STORAGE_KEYS.HERO_ONBOARDING);
    } catch (clearError) {
      console.warn("Failed to clear hero onboarding data:", clearError);
      // Don't throw here as migration was successful
    }
  } catch (error) {
    console.error("Failed to migrate hero onboarding data:", error);
    // Attempt to clear potentially corrupted data
    try {
      localStorage.removeItem(STORAGE_KEYS.HERO_ONBOARDING);
    } catch {
      // Ignore cleanup errors
    }
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
