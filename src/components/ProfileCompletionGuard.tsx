"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";

/**
 * ProfileCompletionGuard
 * Wrap protected pages to enforce:
 *  - Authentication is loaded and present
 *  - Profile and onboarding completion (optional toggle)
 *
 * Usage:
 * <ProfileCompletionGuard requireComplete>
 *   <YourProtectedPage />
 * </ProfileCompletionGuard>
 */
interface GuardProps {
  children: React.ReactNode;
  // When true, users with incomplete profile/onboarding are redirected to "/"
  requireComplete?: boolean;
  // Optional explicit redirect path when not allowed
  redirectTo?: string;
}

export default function ProfileCompletionGuard({
  children,
  requireComplete = false,
  redirectTo,
}: GuardProps) {
  const {
    isLoaded,
    isAuthenticated,
    isProfileComplete,
    isOnboardingComplete,
    refreshUser,
  } = useAuthContext();
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Wait until auth state is loaded
      if (!isLoaded) return;

      // Ensure freshness
      try {
        await refreshUser();
      } catch {
        // ignore
      }
      if (cancelled) return;

      // Not authenticated → send to sign-in with return path
      if (!isAuthenticated) {
        try {
          const dest = new URL("/sign-in", window.location.origin);
          dest.searchParams.set("redirect_url", window.location.pathname);
          router.replace(dest.toString());
        } catch {
          router.replace("/sign-in");
        }
        return;
      }

      // For routes requiring completed profile, enforce completion
      if (requireComplete) {
        const needsWizard = !isProfileComplete || !isOnboardingComplete;
        if (needsWizard) {
          router.replace(redirectTo || "/");
          return;
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [
    isLoaded,
    isAuthenticated,
    isProfileComplete,
    isOnboardingComplete,
    requireComplete,
    redirectTo,
    refreshUser,
    router,
  ]);

  // While auth is loading or we might redirect, avoid flashing the content
  if (!isLoaded) {
    return null;
  }
  if (!isAuthenticated) {
    return null;
  }
  if (requireComplete && (!isProfileComplete || !isOnboardingComplete)) {
    return null;
  }

  return <>{children}</>;
}