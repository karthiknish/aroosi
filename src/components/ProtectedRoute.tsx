"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { showInfoToast, showErrorToast } from "@/lib/ui/toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireProfileComplete?: boolean; // currently not enforced
  requireOnboardingComplete?: boolean; // currently not enforced
  redirectTo?: string;
}

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

  // Auth context (only use fields known to exist across the app)
  const { isLoaded, isSignedIn, profile: rawProfile } = useAuthContext();
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

  // Plan-gated routes
  const premiumAnyPlanRoutes = ["/premium-settings"];
  const premiumPlusRoutes = ["/profile/viewers"];
  const chatRestrictedRoutes = ["/chat"]; // chat for paid only
  const planManagementRoute = "/plans";

  const handleNavigation = useCallback(
    async (to: string, message?: string) => {
      try {
        if (message) showInfoToast(message);
        router.replace(to);
      } catch (e) {
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
        void handleNavigation(redirectTarget, "Please sign in to continue");
      }
      return;
    }

    // Signed in → apply plan gating
    if (isSignedIn) {
      if (premiumAnyPlanRoutes.some((p) => pathname.startsWith(p))) {
        if (userPlan === "free") {
          void handleNavigation(
            planManagementRoute,
            "Upgrade to Premium to access this feature."
          );
          return;
        }
      }
      if (premiumPlusRoutes.some((p) => pathname.startsWith(p))) {
        if (userPlan !== "premiumPlus") {
          void handleNavigation(
            planManagementRoute,
            "Requires Premium Plus plan."
          );
          return;
        }
      }
      if (chatRestrictedRoutes.some((p) => pathname.startsWith(p))) {
        if (userPlan === "free") {
          void handleNavigation(
            planManagementRoute,
            "Upgrade to Premium to chat with your matches."
          );
          return;
        }
      }
    }
  }, [
    authDisabled,
    isLoaded,
    isSignedIn,
    pathname,
    searchParams,
    isPublicRoute,
    requireAuth,
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
