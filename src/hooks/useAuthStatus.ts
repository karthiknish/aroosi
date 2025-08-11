"use client";

import { useClerkAuth } from "@/components/ClerkAuthProvider";

export function useAuthStatus() {
  const { 
    isAuthenticated, 
    isLoading, 
    isProfileComplete, 
    isOnboardingComplete,
    user,
    userId,
    profile,
    error
  } = useClerkAuth();

  return {
    isAuthenticated,
    isLoading,
    isProfileComplete,
    isOnboardingComplete,
    user,
    userId,
    profile,
    error
  };
}