"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useAuthContext } from "@/components/AuthProvider";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const { isProfileComplete, isOnboardingComplete } = useAuthContext();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      // Check if user needs to complete profile
      const needsWizard = !isProfileComplete || !isOnboardingComplete;

      if (needsWizard) {
        // Redirect to home page which will show the profile creation modal
        router.push("/");
      } else {
        // User has completed profile, go to search
        router.push("/search");
      }
    } else {
      // Not signed in, redirect to sign-in page
      router.push("/sign-in");
    }
  }, [isSignedIn, isLoaded, isProfileComplete, isOnboardingComplete, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Completing sign in...</h2>
        <p className="text-gray-600">Please wait while we redirect you.</p>
      </div>
    </div>
  );
}
