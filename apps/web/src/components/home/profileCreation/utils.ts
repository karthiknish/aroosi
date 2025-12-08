import { STORAGE_KEYS } from "@/lib/utils/onboardingStorage";

export function clearAllOnboardingData(): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.PENDING_IMAGES);
    localStorage.removeItem(STORAGE_KEYS.HERO_ONBOARDING);
    localStorage.removeItem("PROFILE_CREATION");
  } catch {
    // ignore
  }
}


