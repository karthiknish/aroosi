"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
// OAuth callback page for handling authentication redirects
import { useAuthContext } from "@/components/FirebaseAuthProvider";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuthContext();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      // Check if this is a popup window
      if (window.opener && !window.opener.closed) {
        // Send message to parent window
        window.opener.postMessage(
          { type: "oauth-success", isSignedIn: true },
          window.location.origin
        );
        // Close the popup
        window.close();
        return;
      }

      // Not a popup, handle normal redirect
      // Always redirect to search now that onboarding flag removed
      router.push("/search");
    } else {
      // Not signed in, redirect to sign-in page
      router.push("/sign-in");
    }
  }, [isSignedIn, isLoaded, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-light">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2 text-neutral-dark">Completing sign in...</h2>
        <p className="text-neutral-light">Please wait while we redirect you.</p>
        {typeof window !== "undefined" && window.opener && (
          <p className="text-sm text-neutral-light/80 mt-2">
            This window will close automatically.
          </p>
        )}
      </div>
    </div>
  );
}
