"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireProfileComplete?: boolean;
  requireOnboardingComplete?: boolean;
  redirectTo?: string;
}

// Helper to read boolean from localStorage
function getLocalStorageFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : false;
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

  // Use state to track if we've checked localStorage
  const [hasCheckedLocalStorage, setHasCheckedLocalStorage] = useState(false);
  const [localProfileComplete, setLocalProfileComplete] = useState<
    boolean | null
  >(null);
  const [localOnboardingComplete, setLocalOnboardingComplete] = useState<
    boolean | null
  >(null);

  // Check localStorage after component mounts
  useEffect(() => {
    if (isClient) {
      setLocalProfileComplete(getLocalStorageFlag("isProfileComplete"));
      setLocalOnboardingComplete(getLocalStorageFlag("isOnboardingComplete"));
      setHasCheckedLocalStorage(true);
    }
  }, [isClient]);

  // Fallback to localStorage if context values are undefined
  const profileComplete = isProfileComplete ?? localProfileComplete;
  const onboardingComplete = isOnboardingComplete ?? localOnboardingComplete;

  // Memoize route checks to prevent unnecessary recalculations
  const { isPublicRoute, isOnboardingRoute, isProfileEditRoute } = useMemo(
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
          toast.info("Please sign in to continue");
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
    !hasCheckedLocalStorage ||
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
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
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

  // Block access if user is signed in but not approved
  if (isSignedIn && isLoaded && isApproved === false) {
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
