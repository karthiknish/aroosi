import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function useOnboardingData(): { hasOnboardingData: boolean } {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [hasOnboardingData, setHasOnboardingData] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;

    setHasOnboardingData(!!localStorage.getItem("onboardingData"));

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
          })
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
