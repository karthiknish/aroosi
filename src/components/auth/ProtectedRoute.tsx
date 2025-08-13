"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useClerkAuth as useAuth } from "@/components/ClerkAuthProvider";
import { showErrorToast } from "@/lib/ui/toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
  requireOnboarding?: boolean;
  adminOnly?: boolean;
}

export default function ProtectedRoute({
  children,
  requireProfile = false,
  requireOnboarding = false,
  adminOnly = false,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const lastToastRef =
    typeof window !== "undefined"
      ? { current: null as { msg: string; ts: number } | null }
      : { current: null as { msg: string; ts: number } | null };

  const notify = (message: string) => {
    const now = Date.now();
    const last = lastToastRef.current;
    if (!last || last.msg !== message || now - last.ts > 3000) {
      showErrorToast(message);
      lastToastRef.current = { msg: message, ts: now };
    }
  };

  useEffect(() => {
    if (isLoading) return;

    // Not authenticated - redirect to sign-in
    if (!isAuthenticated || !user) {
      notify("Please sign in to continue");
      const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(pathname)}`;
      router.push(signInUrl);
      return;
    }

    // Admin only routes
    if (adminOnly && user.role !== "admin") {
      notify("Admin access required");
      router.push("/search");
      return;
    }

    // Check if profile is required
    if (requireProfile && !user.profile) {
      notify("Please create your profile to continue");
      router.push("/profile/create");
      return;
    }

    // Check if profile completion is required
    if (
      requireOnboarding &&
      user.profile &&
      !user.profile.isOnboardingComplete
    ) {
      notify("Please complete onboarding to continue");
      router.push("/profile/complete");
      return;
    }

    setIsChecking(false);
  }, [
    isLoading,
    isAuthenticated,
    user,
    pathname,
    router,
    requireProfile,
    requireOnboarding,
    adminOnly,
  ]);

  // Show loading while checking authentication
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated || !user) {
    return null;
  }

  // Admin check
  if (adminOnly && user.role !== "admin") {
    return null;
  }

  // Profile checks
  if (requireProfile && !user.profile) {
    return null;
  }

  if (requireOnboarding && user.profile && !user.profile.isOnboardingComplete) {
    return null;
  }

  return <>{children}</>;
}
