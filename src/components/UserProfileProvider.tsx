"use client";
import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { UserProfile } from "@/lib/userProfile";
import type { AuthContextValue } from "@/hooks/useUserProfile";
export type { AuthContextValue };

// Define the context type
type UserProfileContextType = AuthContextValue;

// Create the context
const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

// Custom hook to use the context
export function useUserProfileContext(): UserProfileContextType {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error("useUserProfileContext must be used within a UserProfileProvider");
  }
  return context;
}

// Backwards compatible alias expected by legacy components
export const useAuthContext = useUserProfileContext;

// Provider component
export function UserProfileProvider({ children }: { children: ReactNode }) {
  const userProfile = useUserProfile();
  const memoValue = useMemo(
    () => userProfile,
    [userProfile.user, userProfile.profile, userProfile.isLoading, userProfile.error]
  );
  return (
    <UserProfileContext.Provider value={memoValue}>
      {children}
    </UserProfileContext.Provider>
  );
}