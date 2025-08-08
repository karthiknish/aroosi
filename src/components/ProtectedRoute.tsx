"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
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

function ProtectedRouteInner({
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

  if (process.env.NODE_ENV === "development")
    console.log("🔧 DEBUG: ProtectedRoute render started", {
      pathname,
      requireAuth,
      requireProfileComplete,
      requireOnboardingComplete,
      redirectTo,
    });

  // Set isClient to true after component mounts (client-side only)
  useEffect(() => {
    if (process.env.NODE_ENV === "development")
      console.log("🔧 DEBUG: Setting isClient to true");
    setIsClient(true);
  }, []);

  const {
    isLoaded,
    isSignedIn,
    isProfileComplete,
    isOnboardingComplete,
    isLoading: isAuthLoading,
    profile: rawProfile,
    error: authError,
  } = useAuthContext();

  if (process.env.NODE_ENV === "development")
    console.log("🔧 DEBUG: Auth context values", {
      isLoaded,
      isSignedIn,
      isProfileComplete,
      isOnboardingComplete,
      isAuthLoading,
      profile: rawProfile ? "exists" : "null",
      authError: authError ? "exists" : "null",
    });

  // Directly use context values; undefined indicates still loading
  const profile = rawProfile as { subscriptionPlan?: string } | null;
  const profileComplete = isProfileComplete;
  const onboardingComplete = isOnboardingComplete;
  const userPlan = profile?.subscriptionPlan || "free";

  if (process.env.NODE_ENV === "development")
    console.log("🔧 DEBUG: Processed auth values", {
      profileComplete,
      onboardingComplete,
      userPlan,
    });

  // Memoized route checks to prevent unnecessary recalculations
  const {
    isPublicRoute,
    isOnboardingRoute,
    isProfileEditRoute,
    isCreateProfileRoute,
  } = useMemo(() => {
    const routeChecks = {
      isPublicRoute: [
        "/",
        "/sign-in",
        "/forgot-password",
        "/privacy",
        "/terms",
        "/about",
        "/pricing",
        "/how-it-works",
        "/faq",
        "/contact",
      ].some((route) => pathname === route || pathname.startsWith(`${route}/`)),
      isOnboardingRoute: ["/profile/onboarding"].some((route) =>
        pathname.startsWith(route)
      ),
      isProfileEditRoute:
        pathname === "/profile/edit" || pathname.startsWith("/profile/edit/"),
      isCreateProfileRoute: false,
    };

    if (process.env.NODE_ENV === "development")
      console.log("🔧 DEBUG: Route checks", routeChecks);
    return routeChecks;
  }, [pathname]);

  // Define premium page paths and feature restrictions
  const premiumAnyPlanRoutes = ["/premium-settings"];
  const premiumPlusRoutes = ["/profile/viewers"];
  const planManagementRoute = "/plans";

  // Define feature-based restrictions
  const chatRestrictedRoutes = ["/chat"];
  // const advancedSearchRoutes = ["/search"] // Will check for premium plus filters in search

  if (process.env.NODE_ENV === "development")
    console.log("🔧 DEBUG: Route restrictions", {
      premiumAnyPlanRoutes,
      premiumPlusRoutes,
      chatRestrictedRoutes,
      planManagementRoute,
    });

  // Quick bypass for E2E tests or demo environments (constant after build)
  if (process.env.NEXT_PUBLIC_DISABLE_AUTH === "true") {
    console.log("🔧 DEBUG: Auth disabled, rendering children");
    return <>{children}</>;
  }

  // Enhanced navigation handler with better error handling
  const handleNavigation = useCallback(
    (path: string, message?: string) => {
      console.log("🔧 DEBUG: Navigating to", { path, message });
      try {
        if (message) {
          showInfoToast(message);
        }
        router.replace(path);
      } catch (error) {
        console.error("🔧 DEBUG: Navigation error:", error);
        showErrorToast("Navigation failed. Please refresh and try again.");
      }
    },
    [router]
  );

  // Handle all redirections with improved error handling
  useEffect(() => {
    if (process.env.NODE_ENV === "development")
      console.log("🔥 PRODUCTION DEBUG:", {
        pathname,
        isSignedIn,
        profileComplete,
        onboardingComplete,
        isLoaded,
        isAuthLoading,
        profile: profile ? "exists" : "null",
        userPlan,
        isPublicRoute,
        requireAuth,
        requireProfileComplete,
        requireOnboardingComplete,
      });

    if (process.env.NODE_ENV === "development")
      console.log("🔧 DEBUG: useEffect triggered", {
        isClient,
        windowDefined: typeof window !== "undefined",
      });

    // Don't do anything until we're on the client
    if (typeof window === "undefined") {
      if (process.env.NODE_ENV === "development")
        console.log("🔧 DEBUG: Server side, skipping logic");
      return;
    }

    // Don't do anything until we've loaded the auth state
    if (!isLoaded || isAuthLoading) {
      if (process.env.NODE_ENV === "development")
        console.log("🔧 DEBUG: Auth still loading, waiting...", {
          isLoaded,
          isAuthLoading,
        });
      return;
    }

    // Handle auth errors
    if (authError && !isPublicRoute) {
      if (process.env.NODE_ENV === "development")
        console.error("🔧 DEBUG: Auth error detected:", authError);
      handleNavigation("/sign-in", "Session expired. Please sign in again.");
      return;
    }

    // Handle unauthenticated users
    if (isSignedIn === false) {
      if (process.env.NODE_ENV === "development")
        console.log("🔧 DEBUG: User not signed in", {
          requireAuth,
          isPublicRoute,
        });
      if (requireAuth && !isPublicRoute) {
        // Only show toast if we're not already on the sign-in page
        if (!pathname.startsWith("/sign-in")) {
          const getSignInUrl = () => {
            const params = new URLSearchParams(searchParams);
            params.set("redirect_url", pathname);
            return `/sign-in?${params.toString()}`;
          };
          if (process.env.NODE_ENV === "development")
            console.log("🔧 DEBUG: Redirecting to sign-in");
          handleNavigation(
            redirectTo || getSignInUrl(),
            "Please sign in to continue"
          );
        }
      }
      return;
    }

    // If we're still checking auth state, don't proceed
    if (isSignedIn === undefined) {
      if (process.env.NODE_ENV === "development")
        console.log("🔧 DEBUG: Auth state undefined, waiting...");
      return;
    }

    // Handle authenticated users
    if (isSignedIn === true) {
      if (process.env.NODE_ENV === "development")
        console.log("🔧 DEBUG: User is signed in, checking restrictions");

      // If we're still loading profile data, wait
      if (profileComplete === undefined) {
        if (process.env.NODE_ENV === "development")
          console.log(
            "🔧 DEBUG: Profile complete status undefined, waiting..."
          );
        return;
      }

      // Restrict premium-only routes based on subscription
      if (premiumAnyPlanRoutes.some((p) => pathname.startsWith(p))) {
        if (process.env.NODE_ENV === "development")
          console.log("🔧 DEBUG: Checking premium any plan route", {
            userPlan,
          });
        if (userPlan === "free") {
          if (process.env.NODE_ENV === "development")
            console.log(
              "🔧 DEBUG: Free user accessing premium route, redirecting"
            );
          handleNavigation(
            planManagementRoute,
            "Upgrade to Premium to access this feature."
          );
          return;
        }
      }

      if (premiumPlusRoutes.some((p) => pathname.startsWith(p))) {
        if (process.env.NODE_ENV === "development")
          console.log("🔧 DEBUG: Checking premium plus route", { userPlan });
        if (userPlan !== "premiumPlus") {
          if (process.env.NODE_ENV === "development")
            console.log(
              "🔧 DEBUG: Non-premium plus user accessing premium plus route"
            );
          handleNavigation(planManagementRoute, "Requires Premium Plus plan.");
          return;
        }
      }

      // Handle chat/messaging restrictions for free users
      if (chatRestrictedRoutes.some((p) => pathname.startsWith(p))) {
        if (process.env.NODE_ENV === "development")
          console.log("🔧 DEBUG: Checking chat route restriction", {
            userPlan,
          });
        if (userPlan === "free") {
          if (process.env.NODE_ENV === "development")
            console.log("🔧 DEBUG: Free user accessing chat, redirecting");
          handleNavigation(
            planManagementRoute,
            "Upgrade to Premium to chat with your matches."
          );
          return;
        }
      }

      // COMMENTED OUT: Profile/Onboarding completion checks
      /*
      // 1. If either flag is false, redirect to home page for onboarding
      if (!profileComplete || !onboardingComplete) {
        console.log("🔧 DEBUG: Profile or onboarding incomplete", { profileComplete, onboardingComplete });
        if (!isCreateProfileRoute && !isPublicRoute) {
          console.log("🔧 DEBUG: Redirecting to home for onboarding");
          handleNavigation("/");
          return;
        }
      }

      // 2. Both flags true → if currently on any public route, send to /search
      if (profileComplete && onboardingComplete) {
        console.log("🔧 DEBUG: Profile and onboarding complete");
        if (
          (isPublicRoute || isOnboardingRoute || isCreateProfileRoute) &&
          !isProfileEditRoute
        ) {
          console.log("🔧 DEBUG: Redirecting completed user to search");
          handleNavigation("/search");
          return;
        }
      }
      */

      if (process.env.NODE_ENV === "development")
        console.log(
          "🔧 DEBUG: Profile/onboarding checks COMMENTED OUT - allowing access"
        );
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

  if (process.env.NODE_ENV === "development")
    console.log("🔧 DEBUG: Loading states", {
      baseLoading,
      isLoaded,
      isAuthLoading,
      isClient,
      isSignedIn,
      profileComplete,
    });

  // Allow the create-profile wizard to render even while profile flags load.
  const isLoading = isCreateProfileRoute ? false : baseLoading;

  if (process.env.NODE_ENV === "development")
    console.log("🔧 DEBUG: Final isLoading state", {
      isLoading,
      isCreateProfileRoute,
    });

  // On server render or initial client render, return null to prevent hydration mismatch
  if (!isClient) {
    if (process.env.NODE_ENV === "development")
      console.log("🔧 DEBUG: Not client side, returning null");
    return null;
  }

  // Show loading state while checking auth status or redirecting
  // COMMENTED OUT: Profile/onboarding completion loading checks
  const shouldShowLoader =
    isLoading ||
    // COMMENTED OUT: Profile incomplete check
    /*
    (isSignedIn &&
      requireProfileComplete &&
      !profileComplete &&
      !isProfileEditRoute &&
      !isCreateProfileRoute) ||
    */
    // COMMENTED OUT: Onboarding incomplete check
    /*
    (isSignedIn &&
      requireOnboardingComplete &&
      !onboardingComplete &&
      !isOnboardingRoute &&
      !isCreateProfileRoute &&
      !isProfileEditRoute);
    */
    false; // Always false since profile/onboarding checks are commented out

  console.log("🔧 DEBUG: shouldShowLoader", { shouldShowLoader });

  // Show loading state or nothing (for server render)
  if (shouldShowLoader) {
    if (process.env.NODE_ENV === "development")
      console.log("🔧 DEBUG: Showing loader");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // If not signed in and route requires auth, show nothing (will redirect)
  if (!isSignedIn && requireAuth) {
    if (process.env.NODE_ENV === "development")
      console.log("🔧 DEBUG: Not signed in and requires auth, returning null");
    return null;
  }

  // COMMENTED OUT: Profile incomplete check
  /*
  if (
    requireProfileComplete &&
    !profileComplete &&
    !isProfileEditRoute &&
    !isCreateProfileRoute
  ) {
    console.log("🔧 DEBUG: Profile incomplete, returning null");
    return null;
  }
  */

  // COMMENTED OUT: Onboarding incomplete check
  /*
  if (
    requireOnboardingComplete &&
    !onboardingComplete &&
    !isOnboardingRoute &&
    !isCreateProfileRoute &&
    !isProfileEditRoute
  ) {
    console.log("🔧 DEBUG: Onboarding incomplete, returning null");
    return null;
  }
  */

  if (process.env.NODE_ENV === "development")
    console.log("🔧 DEBUG: All checks passed, rendering children");

  // Return children wrapped in a fragment to maintain consistent structure
  return <>{children}</>;
}

export default function ProtectedRoute(props: ProtectedRouteProps) {
  console.log("🔧 DEBUG: ProtectedRoute wrapper called", props);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size={32} />
        </div>
      }
    >
      <ProtectedRouteInner {...props} />
    </Suspense>
  );
}
