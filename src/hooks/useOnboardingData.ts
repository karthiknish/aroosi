import { useEffect, useState } from "react";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { STORAGE_KEYS } from "@/lib/utils/onboardingStorage";

export function useOnboardingData(): { hasOnboardingData: boolean } {
  const { isSignedIn, isLoaded } = useAuthContext();
  const router = useRouter();
  const [hasOnboardingData, setHasOnboardingData] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;

    // Check for any onboarding data in various keys
    const hasData = !!(
      localStorage.getItem(STORAGE_KEYS.HERO_ONBOARDING) ||
      localStorage.getItem(STORAGE_KEYS.PROFILE_CREATION) ||
      localStorage.getItem("onboardingData") // Legacy key
    );
    setHasOnboardingData(hasData);

    if (isSignedIn) {
      // Check if we have onboarding data from the home page
      const onboardingData = localStorage.getItem("onboardingData");

      if (onboardingData) {
        let data;
        try {
          data = JSON.parse(onboardingData);
        } catch {
          // If parsing fails, clear the bad data and exit
          localStorage.removeItem("onboardingData");
          return;
        }
        localStorage.setItem(
          "pendingProfileData",
          JSON.stringify({
            ...data,
            fromHomePage: true,
          }),
        );

        // Clear the original onboarding data
        localStorage.removeItem("onboardingData");

        // Redirect to home page where the modal will open
        router.push("/");
      }
    }
  }, [isSignedIn, isLoaded, router]);

  return {
    hasOnboardingData,
  };
}
