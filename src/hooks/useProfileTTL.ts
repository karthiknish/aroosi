/**
 * Custom hooks for profile TTL management
 * Provides React hooks for caching and managing profile data with TTL
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import {
  profileTTLManagerInstance,
  PROFILE_TTL_CONFIG,
} from "@/lib/storage/profile-ttl-manager";
import { Profile, ProfileFormValues } from "@/types/profile";
import {
  getCurrentUserWithProfile,
  submitProfile,
  fetchUserProfileImages,
} from "@/lib/profile/userProfileApi";

// Hook for fetching and caching profile data
export const useProfileTTL = (userId: string) => {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      // Try to get from cache first
      const cached = profileTTLManagerInstance.getCachedProfileData(userId);
      if (cached) {
        return cached;
      }

      // Fetch from API util if not cached
      const result = await getCurrentUserWithProfile(userId);
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch profile");
      }
      const envelope = (result.data as any) ?? {};
      const profile = envelope.profile ?? envelope;

      // Cache the result
      profileTTLManagerInstance.cacheProfileData(userId, profile);

      return profile;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime)
    enabled: !!userId,
  });

  return profileQuery;
};

// Hook for updating profile with TTL refresh
export const useUpdateProfileTTL = () => {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: Partial<ProfileFormValues>;
    }) => {
  const result = await submitProfile(userId, updates as any, "edit");
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to update profile");
      }
      const envelope = (result.data as any) ?? {};
      return envelope.profile ?? envelope;
    },
    onSuccess: (data, variables) => {
      // Update cache with new data
      profileTTLManagerInstance.cacheProfileData(variables.userId, data);

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["profile", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["profileImages", variables.userId],
      });
    },
  });

  return updateMutation;
};

// Hook for profile images with TTL
export const useProfileImagesTTL = (userId: string) => {
  const queryClient = useQueryClient();

  const imagesQuery = useQuery({
    queryKey: ["profileImages", userId],
    queryFn: async () => {
      // Try to get from cache first
      const cached = profileTTLManagerInstance.getCachedProfileImages(userId);
      if (cached) {
        return cached;
      }

      // Fetch from API util if not cached
      const result = await fetchUserProfileImages(userId);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch profile images");
      }
      const images = (result.data as any) || [];

      // Cache the result
      profileTTLManagerInstance.cacheProfileImages(userId, images);

      return images;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    enabled: !!userId,
  });

  return imagesQuery;
};

// Hook for managing offline profile data
export const useOfflineProfileTTL = (userId: string) => {
  const offlineProfileQuery = useQuery({
    queryKey: ["offlineProfile", userId],
    queryFn: async () => {
      return profileTTLManagerInstance.getOfflineProfile(userId);
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    enabled: !!userId,
  });

  return offlineProfileQuery;
};

// Hook for profile TTL debugging
export const useProfileTTLDebug = () => {
  const getTTLInfo = useCallback((userId: string) => {
    return {
      profileDataTTL: profileTTLManagerInstance.getProfileDataTTL(userId),
      hasValidProfileData:
        profileTTLManagerInstance.hasValidProfileData(userId),
      cachedUserIds: profileTTLManagerInstance.getCachedProfileUserIds(),
    };
  }, []);

  const forceCleanup = useCallback(() => {
    profileTTLManagerInstance.cleanupExpiredProfileData();
  }, []);

  return {
    getTTLInfo,
    forceCleanup,
  };
};

// Hook for profile TTL configuration
export const useProfileTTLConfig = () => {
  const updateTTLConfig = useCallback(
    (config: Partial<typeof PROFILE_TTL_CONFIG>) => {
      console.log("Updating TTL config:", config);
    },
    []
  );

  return {
    config: {
      PROFILE_DATA: 30 * 60 * 1000, // 30 minutes
      PROFILE_IMAGES: 60 * 60 * 1000, // 1 hour
      PROFILE_LISTINGS: 15 * 60 * 1000, // 15 minutes
      SEARCH_RESULTS: 10 * 60 * 1000, // 10 minutes
      OFFLINE_CACHE: 24 * 60 * 60 * 1000, // 24 hours
    },
    updateTTLConfig,
  };
};
