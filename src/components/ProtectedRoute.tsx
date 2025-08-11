"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/components/ClerkAuthProvider";
import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  Suspense,
  useRef,
} from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { showInfoToast, showErrorToast } from "@/lib/ui/toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireProfileComplete?: boolean; // currently not enforced
  requireOnboardingComplete?: boolean; // currently not enforced
  redirectTo?: string;
}

// Plan-gated routes (module scope to keep useEffect deps stable)
const premiumAnyPlanRoutes = ["/premium-settings"] as const;
const premiumPlusRoutes = ["/profile/viewers"] as const;
const chatRestrictedRoutes = ["/chat"] as const; // chat for paid only
const planManagementRoute = "/plans" as const;

function ProtectedRouteInner({
  children,
  requireAuth = true,
  requireProfileComplete = false,
  requireOnboardingComplete = false,
  redirectTo,
}: ProtectedRouteProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const lastToastRef = useRef<{ msg: string; ts: number } | null>(null);

  // Auth context (only use fields known to exist across the app)
  const {
    isLoaded,
    isSignedIn,
    isProfileComplete,
    isOnboardingComplete,
    profile: rawProfile,
  } = useAuthContext();
  const profile = (rawProfile as { subscriptionPlan?: string } | null) || null;
  const userPlan =
    (profile?.subscriptionPlan as
      | "free"
      | "premium"
      | "premiumPlus"
      | undefined) || "free";

  // Client-only flag to avoid hydration mismatch
  useEffect(() => setIsClient(true), []);

  // Memoized route checks
  const {
    isPublicRoute,
    isOnboardingRoute,
    isProfileEditRoute,
    isCreateProfileRoute,
  } = useMemo(() => {
    const publicRoutes = [
      "/",
      "/privacy",
      "/terms",
      "/about",
      "/pricing",
      "/how-it-works",
      "/faq",
      "/contact",
      "/sign-in",
      "/sign-up",
    ];
    return {
      isPublicRoute: publicRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      ),
      isOnboardingRoute: pathname.startsWith("/profile/onboarding"),
      isProfileEditRoute:
        pathname === "/profile/edit" || pathname.startsWith("/profile/edit/"),
      isCreateProfileRoute: pathname.startsWith("/create-profile"),
    };
  }, [pathname]);

  // Plan-gated routes moved to module scope

  // Debounced toast + navigation helper
  const handleNavigation = useCallback(
    async (
      to: string,
      message?: string,
      severity: "info" | "error" = "info"
    ) => {
      try {
        if (message) {
          const now = Date.now();
          const last = lastToastRef.current;
          if (!last || last.msg !== message || now - last.ts > 1500) {
            if (severity === "error") {
              showErrorToast(null, message);
            } else {
              showInfoToast(message);
            }
            lastToastRef.current = { msg: message, ts: now };
          }
        }
        void router.replace(to);
      } catch {
        showErrorToast("Navigation failed. Please refresh and try again.");
      }
    },
    [router]
  );

  // Short-circuit for environments where auth is disabled
  const authDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

  useEffect(() => {
    if (authDisabled) return;

    // Wait for auth to hydrate
    if (!isLoaded) return;

    // Not signed in → redirect if route requires auth and isn't public
    if (requireAuth && isSignedIn === false && !isPublicRoute) {
      if (!pathname.startsWith("/sign-in")) {
        const redirectTarget = redirectTo
          ? redirectTo
          : (() => {
              const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
              return `/sign-in?redirect_url=${encodeURIComponent(current)}`;
            })();
        void handleNavigation(
          redirectTarget,
          "Please sign in to continue",
          "error"
        );
      }
      return;
    }

    // Signed in → apply plan gating
    if (isSignedIn) {
      if (premiumAnyPlanRoutes.some((p) => pathname.startsWith(p))) {
        if (userPlan === "free") {
          void handleNavigation(
            planManagementRoute,
            "Upgrade to Premium to access this feature.",
            "error"
          );
          return;
        }
      }
      if (premiumPlusRoutes.some((p) => pathname.startsWith(p))) {
        if (userPlan !== "premiumPlus") {
          void handleNavigation(
            planManagementRoute,
            "Requires Premium Plus plan.",
            "error"
          );
          return;
        }
      }
      if (chatRestrictedRoutes.some((p) => pathname.startsWith(p))) {
        if (userPlan === "free") {
          void handleNavigation(
            planManagementRoute,
            "Upgrade to Premium to chat with your matches.",
            "error"
          );
          return;
        }
      }

      // Enforce onboarding/profile completeness when requested
      if (requireOnboardingComplete && !isOnboardingComplete) {
        // Allow access if already on onboarding or create-profile routes
        if (!isOnboardingRoute && !isCreateProfileRoute) {
          void handleNavigation("/", "Please finish onboarding to continue.");
          return;
        }
      }
      if (requireProfileComplete && !isProfileComplete) {
        // Allow access if on onboarding/create-profile or profile edit routes
        if (
          !isOnboardingRoute &&
          !isCreateProfileRoute &&
          !isProfileEditRoute
        ) {
          // Prefer edit route if profile exists; fallback to create-profile
          const target = "/profile/edit";
          void handleNavigation(
            target,
            "Complete your profile to access this page.",
            "error"
          );
          return;
        }
      }
    }
  }, [
    authDisabled,
    isLoaded,
    isSignedIn,
    isProfileComplete,
    isOnboardingComplete,
    pathname,
    searchParams,
    isPublicRoute,
    requireAuth,
    requireOnboardingComplete,
    requireProfileComplete,
    isOnboardingRoute,
    isCreateProfileRoute,
    isProfileEditRoute,
    redirectTo,
    userPlan,
    handleNavigation,
  ]);

  // Loading state
  if (!isClient) return null;
  if (!authDisabled && !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  // If not signed in and route requires auth, render nothing while effect redirects
  if (!authDisabled && requireAuth && isSignedIn === false && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}

export default function ProtectedRoute(props: ProtectedRouteProps) {
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
