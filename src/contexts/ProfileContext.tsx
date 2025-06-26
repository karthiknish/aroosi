"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import type { Profile, ProfileContextType } from "@/types/profile";

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
      const res = await fetch("/api/user/me");
      const json = await res.json();
      if (res.ok && json?.success) {
        // API shape: { success: true, data: { ...user, profile: {...} } }
        const envelope = json.data ?? {};
        setProfile(envelope.profile ?? null);
      } else {
        setError(new Error(json.error || "Failed to load profile"));
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchProfile();
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
