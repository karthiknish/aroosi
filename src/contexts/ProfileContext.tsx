"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type { Profile, ProfileContextType } from "@/types/profile";
import { getCurrentUserWithProfile } from "@/lib/profile/userProfileApi";

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getCurrentUserWithProfile();
      if (result.success && result.data) {
        const envelope = result.data ?? {};
        setProfile((envelope as any).profile ?? null);
      } else {
        setError(new Error(result.error || "Failed to load profile"));
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const contextValue: ProfileContextType = {
    isProfileComplete: Boolean(profile?.isProfileComplete),
    isLoading,
    error,
    profile,
    refetchProfileStatus: fetchProfile,
  };

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfileContext = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfileContext must be used within ProfileProvider");
  }
  return ctx;
};
