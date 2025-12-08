/**
 * Hook for signup TTL integration
 * Manages TTL caching during signup flow
 */

import { useMutation } from "@tanstack/react-query";
import { signupTTLIntegration } from "@/lib/profile/signup-ttl-integration";
import { Profile } from "@/types/profile";

export const useSignupTTL = () => {
  const cacheProfileDraft = useMutation({
    mutationFn: async ({
      userId,
      profileData,
    }: {
      userId: string;
      profileData: any;
    }) => {
      signupTTLIntegration.cacheProfileDraft(userId, profileData);
    },
  });

  const getProfileDraft = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      return signupTTLIntegration.getProfileDraft(userId);
    },
  });

  const clearProfileDraft = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      signupTTLIntegration.clearProfileDraft(userId);
    },
  });

  const handleProfileCreation = useMutation({
    mutationFn: async ({
      userId,
      profile,
    }: {
      userId: string;
      profile: Profile;
    }) => {
      signupTTLIntegration.handleProfileCreation(userId, profile);
    },
  });

  const handleProfileCompletion = useMutation({
    mutationFn: async ({
      userId,
      profile,
    }: {
      userId: string;
      profile: Profile;
    }) => {
      signupTTLIntegration.handleProfileCompletion(userId, profile);
    },
  });

  return {
    cacheProfileDraft,
    getProfileDraft,
    clearProfileDraft,
    handleProfileCreation,
    handleProfileCompletion,
  };
};
