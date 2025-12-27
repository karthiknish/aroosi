"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "@/lib/profile/userProfileApi";
import { useProfileImages } from "@/hooks/useProfileImages";
import { useInterestStatus } from "@/hooks/useInterestStatus";
import { useBlockStatus } from "@/hooks/useSafety";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { useSubscriptionGuard } from "@/hooks/useSubscription";
import { useOffline } from "@/hooks/useOffline";
import { buildProfileImageUrl } from "@/lib/images/profileImageUtils";
import { recordProfileView } from "@/lib/utils/profileApi";
import { getJson } from "@/lib/http/client";
import { unblockUserUtil, blockUserUtil, handleErrorUtil } from "@/lib/chat/utils";
import { showSuccessToast, showErrorToast, showUndoToast } from "@/lib/ui/toast";
import type { Profile } from "@aroosi/shared/types";

export function useProfileDetailLogic() {
  const params = useParams();
  const { profile: rawCurrentUserProfile, isLoaded, isAuthenticated } = useAuthContext();
  const networkStatus = useOffline();
  const { trackUsage } = useUsageTracking(undefined);
  const { isPremiumPlus } = useSubscriptionGuard();
  
  const id = params?.id as string;
  const userId = id as string;

  const currentUserProfile = rawCurrentUserProfile as any;
  const fromUserId = currentUserProfile?.uid || currentUserProfile?.id;
  const toUserId = userId;

  const isOwnProfile = Boolean(
    currentUserProfile &&
      userId &&
      (currentUserProfile.id === userId || currentUserProfile.uid === userId)
  );

  const skipRemoteProfile = isOwnProfile && !!currentUserProfile;

  // Profile data fetching
  const {
    data: profileData,
    isLoading: loadingProfileRemote,
    isFetching: fetchingProfile,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["profileData", userId],
    queryFn: async () => {
      if (!userId) return null;
      const result = await fetchUserProfile(userId);
      if (!result.success && result.error?.code === "AUTH_REQUIRED") {
        const error = new Error(result.error.message || "Authentication not ready");
        (error as any).code = "AUTH_REQUIRED";
        throw error;
      }
      return result;
    },
    enabled: !!userId && isLoaded && isAuthenticated && !skipRemoteProfile,
    retry: (failureCount, error) => {
      const apiError = error as { code?: string } | undefined;
      return apiError?.code === "AUTH_REQUIRED" && failureCount < 5;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
  });

  const loadingProfile = skipRemoteProfile ? false : (loadingProfileRemote || fetchingProfile);
  const profileApiResponse = profileData as { success?: boolean; data?: any; error?: any } | null;
  const profileRaw = skipRemoteProfile
    ? (currentUserProfile as any)
    : profileApiResponse?.success ? profileApiResponse.data : null;
  const profile: Profile | null = profileRaw ?? null;
  const profileApiError = profileApiResponse?.success === false ? profileApiResponse.error : null;

  // Image handling
  const { images: fetchedImages } = useProfileImages({
    userId,
    enabled: isLoaded && isAuthenticated,
    preferInlineUrls: Array.isArray(profile?.profileImageUrls)
      ? profile!.profileImageUrls.map((u) => buildProfileImageUrl(String(u)))
      : profile?.profileImageUrls,
  });

  const localCurrentUserImageOrder: string[] = useMemo(() => {
    if (isOwnProfile && profile) return (profile as any).profileImageIds || [];
    return [];
  }, [isOwnProfile, profile]);

  const imagesToShow: string[] = useMemo(() => {
    if (profile?.profileImageUrls?.length) {
      return profile.profileImageUrls
        .map((u) => buildProfileImageUrl(String(u)))
        .filter(Boolean);
    }
    if (isOwnProfile && localCurrentUserImageOrder.length) {
      const lookup = new Map(fetchedImages.map((i) => [i.storageId || i.url, i.url]));
      return localCurrentUserImageOrder
        .map((id) => lookup.get(id) || "")
        .filter(Boolean) as string[];
    }
    return fetchedImages
      .map((i) => buildProfileImageUrl(String(i.url || "")))
      .filter(Boolean);
  }, [profile?.profileImageUrls, isOwnProfile, localCurrentUserImageOrder, fetchedImages]);

  const [currentImageIdx, setCurrentImageIdx] = useState<number>(0);

  // Keyboard navigation for gallery
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setCurrentImageIdx((idx) => Math.max(0, idx - 1));
      else if (e.key === "ArrowRight")
        setCurrentImageIdx((idx) => Math.min(Math.max(imagesToShow.length - 1, 0), idx + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imagesToShow.length]);

  // Interest handling
  const trackWrapper = useCallback((evt: { feature: string; metadata?: Record<string, any> }) => {
    trackUsage({ feature: evt.feature as any, metadata: evt.metadata });
  }, [trackUsage]);

  const interestState = useInterestStatus({
    fromUserId,
    toUserId: String(toUserId),
    enabled: isLoaded && isAuthenticated,
    track: trackWrapper,
  });

  // Moderation
  const { data: blockStatus } = useBlockStatus(toUserId);
  const isBlocked = blockStatus?.isBlocked || false;
  const isBlockedBy = blockStatus?.isBlockedBy || false;
  const [showReportModal, setShowReportModal] = useState(false);

  const handleUnblockUser = async () => {
    try {
      await unblockUserUtil({ matchUserId: userId, setIsBlocked: () => {}, setShowReportModal });
      trackUsage({ feature: "user_unblock" as any, metadata: { targetUserId: userId } });
      showUndoToast("User unblocked", async () => {
        try {
          await blockUserUtil({ matchUserId: userId, setIsBlocked: () => {}, setShowReportModal });
          trackUsage({ feature: "user_block" as any, metadata: { targetUserId: userId } });
          showSuccessToast("User re-blocked");
        } catch (e) {
          showErrorToast(null, "Failed to re-block user");
        }
      });
    } catch (err) {
      showErrorToast(null, "Failed to unblock user");
    }
  };

  // Compatibility
  const { data: compatData } = useQuery<{ score: number | null; reasons: string[] } | null>({
    queryKey: ["compatibility", userId],
    queryFn: async () => {
      if (!userId || isOwnProfile) return null;
      return await getJson(`/api/compatibility/${encodeURIComponent(String(userId))}`);
    },
    enabled: !!userId && !isOwnProfile && isLoaded && isAuthenticated,
    staleTime: 60_000,
  });

  // Profile view recording
  useEffect(() => {
    if (!isOwnProfile && profile?._id) {
      void recordProfileView({ profileId: String(profile._id ?? "") });
      trackUsage({ feature: "profile_view", metadata: { targetUserId: userId } });
    }
  }, [isOwnProfile, profile?._id, trackUsage, userId]);

  return {
    userId,
    profile,
    isOwnProfile,
    loadingProfile,
    profileError,
    profileApiError,
    refetchProfile,
    imagesToShow,
    currentImageIdx,
    setCurrentImageIdx,
    interestState,
    isBlocked,
    isBlockedBy,
    showReportModal,
    setShowReportModal,
    handleUnblockUser,
    compatData,
    isPremiumPlus,
    networkStatus,
    trackUsage,
  };
}
