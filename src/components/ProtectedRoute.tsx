"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import { useEffect, useMemo, useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { showInfoToast } from "@/lib/ui/toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireProfileComplete?: boolean;
  requireOnboardingComplete?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requireAuth = true,
  requireProfileComplete = true,
  requireOnboardingComplete = true,
  redirectTo,
}: ProtectedRouteProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true after component mounts (client-side only)
  useEffect(() => {
    setIsClient(true);
  }, []);

  const {
    isLoaded,
    isSignedIn,
    isProfileComplete,
    isOnboardingComplete,
    isLoading: isAuthLoading,
    isApproved,
  } = useAuthContext();

  // Directly use context values; undefined indicates still loading
  const profileComplete = isProfileComplete;
  const onboardingComplete = isOnboardingComplete;

  // Memoize route checks to prevent unnecessary recalculations
  const {
    isPublicRoute,
    isOnboardingRoute,
    isProfileEditRoute,
    isCreateProfileRoute,
  } = useMemo(
    () => ({
      isPublicRoute: [
        "/",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/privacy",
        "/terms",
        "/about",
        "/pricing",
        "/how-it-works",
        "/faq",
        "/contact",
      ].some((route) => pathname === route || pathname.startsWith(`${route}/`)),
      isOnboardingRoute: ["/create-profile", "/profile/onboarding"].some(
        (route) => pathname.startsWith(route)
      ),
      isProfileEditRoute:
        pathname === "/profile/edit" || pathname.startsWith("/profile/edit/"),
      isCreateProfileRoute:
        pathname === "/create-profile" ||
        pathname.startsWith("/create-profile"),
    }),
    [pathname]
  );

  // Handle all redirections
  useEffect(() => {
    // Don't do anything until we're on the client
    if (typeof window === "undefined") return;

    // Don't do anything until we've loaded the auth state
    if (!isLoaded || isAuthLoading) return;

    // Handle unauthenticated users
    if (isSignedIn === false) {
      if (requireAuth && !isPublicRoute) {
        // Only show toast if we're not already on the sign-in page
        if (!pathname.startsWith("/sign-in")) {
          showInfoToast("Please sign in to continue");
          const getSignInUrl = () => {
            const params = new URLSearchParams(searchParams);
            params.set("redirect_url", pathname);
            return `/sign-in?${params.toString()}`;
          };
          router.replace(redirectTo || getSignInUrl());
        }
      }
      return;
    }

    // If we're still checking auth state, don't proceed
    if (isSignedIn === undefined) return;

    // Handle authenticated users
    if (isSignedIn === true) {
      // If we're still loading profile data, wait
      if (profileComplete === undefined) return;

      // If profile and onboarding are complete, redirect to search if on a public or onboarding route,
      // BUT do NOT redirect if on /profile/edit
      if (profileComplete && onboardingComplete) {
        if (
          (isPublicRoute || isOnboardingRoute) &&
          !isProfileEditRoute // <-- prevent redirect from /profile/edit
        ) {
          router.replace("/search");
          return;
        }
      }
      // If profile is incomplete, redirect to profile edit
      else if (!profileComplete) {
        if (!isProfileEditRoute) {
          router.replace("/profile/edit");
          return;
        }
      }
      // If profile is complete but onboarding is not, redirect to create-profile
      else if (!onboardingComplete) {
        if (pathname !== "/create-profile") {
          router.replace("/create-profile");
          return;
        }
      }
    }

    console.log("[ProtectedRoute] State", {
      isSignedIn,
      profileComplete,
      onboardingComplete,
      pathname,
    });
  }, [
    isLoaded,
    isSignedIn,
    profileComplete,
    onboardingComplete,
    isAuthLoading,
    pathname,
    router,
    redirectTo,
    isPublicRoute,
    isOnboardingRoute,
    requireAuth,
    requireProfileComplete,
    requireOnboardingComplete,
    searchParams,
    isProfileEditRoute,
  ]);

  // Determine if we should show a loading state
  const isLoading =
    !isLoaded ||
    isAuthLoading ||
    (isClient &&
      (isSignedIn === undefined ||
        (isSignedIn && profileComplete === undefined)));

  // On server render or initial client render, return null to prevent hydration mismatch
  if (!isClient) {
    return null;
  }

  // Show loading state while checking auth status or redirecting
  const shouldShowLoader =
    isLoading ||
    (isSignedIn &&
      requireProfileComplete &&
      !profileComplete &&
      !isProfileEditRoute) ||
    (isSignedIn &&
      requireOnboardingComplete &&
      !onboardingComplete &&
      !isOnboardingRoute &&
      !isProfileEditRoute);

  // Show loading state or nothing (for server render)
  if (shouldShowLoader) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // If not signed in and route requires auth, show nothing (will redirect)
  if (!isSignedIn && requireAuth) {
    return null;
  }

  // If profile is incomplete and not on the edit profile page, show nothing (will redirect)
  if (requireProfileComplete && !profileComplete && !isProfileEditRoute) {
    return null;
  }

  // If onboarding is incomplete and not on an onboarding route, show nothing (will redirect)
  if (
    requireOnboardingComplete &&
    !onboardingComplete &&
    !isOnboardingRoute &&
    !isProfileEditRoute
  ) {
    return null;
  }

  // Block access if user is signed in but not approved, but allow create-profile and edit-profile routes
  if (
    isSignedIn &&
    isLoaded &&
    isApproved === false &&
    !isCreateProfileRoute &&
    !isProfileEditRoute
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-yellow-100 text-yellow-800 p-6 rounded shadow max-w-md mx-auto text-center">
          <h2 className="text-xl font-semibold mb-2">
            Profile Pending Approval
          </h2>
          <p>
            Your profile is pending admin approval. You will be notified when
            approved.
          </p>
        </div>
      </div>
    );
  }

  // Return children wrapped in a fragment to maintain consistent structure
  return <>{children}</>;
}
