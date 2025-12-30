"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { isOnboardingEssentialComplete } from "@/lib/userProfile/calculations";

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
  const { isLoaded, isAuthenticated, refreshUser, profile } = useAuthContext();
  const router = useRouter();

  // Add robust diagnostics to trace guard-driven redirects
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.info("[Guard] effect enter", {
      isLoaded,
      isAuthenticated,
      // onboarding flag removed
      requireComplete,
      redirectTo,
      path: typeof window !== "undefined" ? window.location.pathname : "(ssr)",
    });
  }, [isLoaded, isAuthenticated, requireComplete, redirectTo]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Wait until auth state is loaded
      if (!isLoaded) {
        // eslint-disable-next-line no-console
        console.info("[Guard] waiting for auth to load");
        return;
      }

      // Ensure freshness (do not loop if refreshUser triggers state changes)
      try {
        await refreshUser();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[Guard] refreshUser failed", e);
      }
      if (cancelled) return;

      // Not authenticated → send to sign-in with return path
      if (!isAuthenticated) {
        // eslint-disable-next-line no-console
        console.warn("[Guard] redirecting: not authenticated");
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
      if (requireComplete && !isOnboardingEssentialComplete(profile || {})) {
        // eslint-disable-next-line no-console
        console.warn("[Guard] redirecting: profile incomplete");
        const dest = redirectTo || "/profile/onboarding";
        try {
          const url = new URL(dest, window.location.origin);
          url.searchParams.set("redirect_url", window.location.pathname);
          router.replace(url.toString());
        } catch {
          router.replace(dest);
        }
        return;
      }

      // eslint-disable-next-line no-console
      console.info("[Guard] allow render");
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [
    isLoaded,
    isAuthenticated,
    profile,
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
  // Block render if profile is incomplete and completion is required
  if (requireComplete && !isOnboardingEssentialComplete(profile || {})) {
    return null;
  }

  return <>{children}</>;
}