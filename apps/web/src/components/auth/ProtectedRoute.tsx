"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useFirebaseAuth as useAuth } from "@/components/FirebaseAuthProvider";
import { showErrorToast } from "@/lib/ui/toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfile?: boolean;
  requireOnboarding?: boolean; // deprecated
  adminOnly?: boolean;
}

export default function ProtectedRoute({
  children,
  requireProfile = false,
  requireOnboarding = false,
  adminOnly = false,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, profile } = useAuth() as any;
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
    const userRole = (user as any)?.role || profile?.role;
    if (adminOnly && userRole !== "admin") {
      notify("Admin access required");
      router.push("/search");
      return;
    }

    // Check if profile is required
    const hasProfile = !!profile || !!(user as any)?.profile;
    if (requireProfile && !hasProfile) {
      notify("Please create your profile to continue");
      router.push("/");
      return;
    }

    // Check if profile completion is required
    // onboarding requirement removed

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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated || !user) {
    return null;
  }

  // Admin check
  if (adminOnly && ((user as any)?.role || profile?.role) !== "admin") {
    return null;
  }

  // Profile checks
  if (requireProfile && !(profile || (user as any)?.profile)) {
    return null;
  }

  // onboarding gate removed

  return <>{children}</>;
}
