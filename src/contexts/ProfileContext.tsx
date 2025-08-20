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
import { useAuthContext } from "@/components/FirebaseAuthProvider";

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const { user, profile: authProfile } = useAuthContext();
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const id =
        user?.uid || (authProfile as any)?._id || (authProfile as any)?.userId;
      if (!id) {
        setProfile(null);
        setIsLoading(false);
        return;
      }
      const result = await getCurrentUserWithProfile(id);
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
  }, [user, authProfile]);

  // Initial load
  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const contextValue: ProfileContextType = {
    // Deprecated flag removed from Profile; derive completeness heuristically
    isProfileComplete: profile
      ? Boolean(
          profile.profileCompletionPercentage == null
            ? // Fallback heuristic: required core fields present
              profile.fullName &&
                profile.dateOfBirth &&
                profile.gender &&
                profile.city &&
                profile.aboutMe &&
                profile.occupation &&
                profile.education
            : profile.profileCompletionPercentage >= 90
        )
      : false,
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
