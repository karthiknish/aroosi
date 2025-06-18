"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import { useEffect, useMemo, useState, useCallback } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { showInfoToast, showErrorToast } from "@/lib/ui/toast";

/* eslint-disable react-hooks/rules-of-hooks */

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
    profile,
    error: authError,
  } = useAuthContext();

  // Directly use context values; undefined indicates still loading
  const profileComplete = isProfileComplete;
  const onboardingComplete = isOnboardingComplete;
  const userPlan = profile?.subscriptionPlan || "free";

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

  // Define premium page paths and feature restrictions
  const premiumAnyPlanRoutes = ["/premium-settings", "/matches"];
  const premiumPlusRoutes = ["/profile/viewers"];
  const planManagementRoute = "/plans";
  
  // Define feature-based restrictions
  const chatRestrictedRoutes = ["/matches", "/chat"];
  // const advancedSearchRoutes = ["/search"] // Will check for premium plus filters in search

  // Quick bypass for E2E tests or demo environments (constant after build)
  if (process.env.NEXT_PUBLIC_DISABLE_AUTH === "true") {
    return <>{children}</>;
  }

  // Enhanced navigation handler with better error handling
  const handleNavigation = useCallback((path: string, message?: string) => {
    try {
      if (message) {
        showInfoToast(message);
      }
      router.replace(path);
    } catch (error) {
      console.error("ProtectedRoute: Navigation error:", error);
      showErrorToast("Navigation failed. Please refresh and try again.");
    }
  }, [router]);

  // Handle all redirections with improved error handling
  useEffect(() => {
    // Don't do anything until we're on the client
    if (typeof window === "undefined") return;

    // Don't do anything until we've loaded the auth state
    if (!isLoaded || isAuthLoading) return;

    // Handle auth errors
    if (authError && !isPublicRoute) {
      console.error("ProtectedRoute: Auth error detected:", authError);
      handleNavigation("/sign-in", "Session expired. Please sign in again.");
      return;
    }

    // Handle unauthenticated users
    if (isSignedIn === false) {
      if (requireAuth && !isPublicRoute) {
        // Only show toast if we're not already on the sign-in page
        if (!pathname.startsWith("/sign-in")) {
          const getSignInUrl = () => {
            const params = new URLSearchParams(searchParams);
            params.set("redirect_url", pathname);
            return `/sign-in?${params.toString()}`;
          };
          handleNavigation(redirectTo || getSignInUrl(), "Please sign in to continue");
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

      // Restrict premium-only routes based on subscription
      if (premiumAnyPlanRoutes.some((p) => pathname.startsWith(p))) {
        if (userPlan === "free") {
          handleNavigation(planManagementRoute, "Upgrade to Premium to access this feature.");
          return;
        }
      }

      if (premiumPlusRoutes.some((p) => pathname.startsWith(p))) {
        if (userPlan !== "premiumPlus") {
          handleNavigation(planManagementRoute, "Requires Premium Plus plan.");
          return;
        }
      }
      
      // Handle chat/messaging restrictions for free users
      if (chatRestrictedRoutes.some((p) => pathname.startsWith(p))) {
        if (userPlan === "free") {
          handleNavigation(planManagementRoute, "Upgrade to Premium to chat with your matches.");
          return;
        }
      }

      // 1. If either flag is false, keep user on /create-profile until completed
      if (!profileComplete || !onboardingComplete) {
        if (!isCreateProfileRoute) {
          handleNavigation("/create-profile");
          return;
        }
      }

      // 2. Both flags true → if currently on create-profile or any public route, send to /search
      if (profileComplete && onboardingComplete) {
        if (
          (isPublicRoute || isOnboardingRoute || isCreateProfileRoute) &&
          !isProfileEditRoute
        ) {
          handleNavigation("/search");
          return;
        }
      }
    }
  }, [
    isLoaded,
    isSignedIn,
    profileComplete,
    onboardingComplete,
    isAuthLoading,
    authError,
    pathname,
    handleNavigation,
    redirectTo,
    isPublicRoute,
    isOnboardingRoute,
    requireAuth,
    requireProfileComplete,
    requireOnboardingComplete,
    searchParams,
    isProfileEditRoute,
    userPlan,
    premiumAnyPlanRoutes,
    premiumPlusRoutes,
    planManagementRoute,
    isCreateProfileRoute,
  ]);

  // Base loading state when auth/profile still initializing
  const baseLoading =
    !isLoaded ||
    isAuthLoading ||
    (isClient &&
      (isSignedIn === undefined ||
        (isSignedIn && profileComplete === undefined)));

  // Allow the create-profile wizard to render even while profile flags load.
  const isLoading = isCreateProfileRoute ? false : baseLoading;

  // On server render or initial client render, return null to prevent hydration mismatch
  if (!isClient) {
    return null;
  }

  // Show loading state while checking auth status or redirecting
  const shouldShowLoader =
    isLoading ||
    // If profile is incomplete, *show* loader only when we are NOT allowed to be on the
    // create-profile wizard or edit-profile screen. Otherwise let the wizard render.
    (isSignedIn &&
      requireProfileComplete &&
      !profileComplete &&
      !isProfileEditRoute &&
      !isCreateProfileRoute) ||
    // Same idea for onboarding: don't block the create-profile wizard itself.
    (isSignedIn &&
      requireOnboardingComplete &&
      !onboardingComplete &&
      !isOnboardingRoute &&
      !isCreateProfileRoute &&
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

  // If profile is incomplete and we're *not* on a route explicitly meant to complete it,
  // do not render children (user will be redirected). Allow /create-profile and edit screens.
  if (
    requireProfileComplete &&
    !profileComplete &&
    !isProfileEditRoute &&
    !isCreateProfileRoute
  ) {
    return null;
  }

  // Same for onboarding: allow wizard routes to render.
  if (
    requireOnboardingComplete &&
    !onboardingComplete &&
    !isOnboardingRoute &&
    !isCreateProfileRoute &&
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
