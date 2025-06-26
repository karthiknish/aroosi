import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function useOnboardingData() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      // Check if we have onboarding data from the home page
      const onboardingData = localStorage.getItem("onboardingData");
      
      if (onboardingData) {
        // Store it with the user ID for later use in profile creation
        const data = JSON.parse(onboardingData);
        localStorage.setItem("pendingProfileData", JSON.stringify({
          ...data,
          fromHomePage: true,
        }));
        
        // Clear the original onboarding data
        localStorage.removeItem("onboardingData");
        
        // Redirect to profile creation with the data
        router.push("/create-profile");
      }
    }
  }, [isSignedIn, isLoaded, router]);

  return {
    hasOnboardingData: !!localStorage.getItem("onboardingData"),
  };
}