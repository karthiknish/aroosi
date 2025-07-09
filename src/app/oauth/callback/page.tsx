"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { isAuthenticated, isLoaded, isProfileComplete, isOnboardingComplete } = useAuthContext();

  useEffect(() => {
    if (!isLoaded) return;

    if (isAuthenticated) {
      // Check if this is a popup window
      if (window.opener && !window.opener.closed) {
        // Send message to parent window
        window.opener.postMessage(
          { type: "oauth-success", isAuthenticated: true },
          window.location.origin,
        );
        // Close the popup
        window.close();
        return;
      }

      // Not a popup, handle normal redirect
      const needsWizard = !isProfileComplete || !isOnboardingComplete;

      if (needsWizard) {
        // Redirect to home page which will show the profile creation modal
        router.push("/");
      } else {
        // User has completed profile, go to search
        router.push("/search");
      }
    } else {
      // Not authenticated, redirect to sign-in page
      router.push("/sign-in");
    }
  }, [isAuthenticated, isLoaded, isProfileComplete, isOnboardingComplete, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Completing sign in...</h2>
        <p className="text-gray-600">Please wait while we redirect you.</p>
        {typeof window !== "undefined" && window.opener && (
          <p className="text-sm text-gray-500 mt-2">
            This window will close automatically.
          </p>
        )}
      </div>
    </div>
  );
}
