"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  safetyAPI,
  type ReportData,
  type ReportReason,
} from "@/lib/api/safety";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import { useAuthContext } from "@/components/AuthProvider";

// Hook for reporting users
export const useReportUser = () => {
  useAuthContext(); // cookie-based auth
  return useMutation({
    mutationFn: (data: ReportData) => safetyAPI.reportUser(null, data),
    onSuccess: () => {
      showSuccessToast(
        "User reported successfully. Our team will review this report.",
      );
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to report user");
    },
  });
};

// Hook for blocking users
export const useBlockUser = () => {
  useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blockedUserId: string) =>
      safetyAPI.blockUser(null, blockedUserId),
    onSuccess: (_, blockedUserId) => {
      showSuccessToast("User blocked successfully");
      void queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      void queryClient.invalidateQueries({
        queryKey: ["blockStatus", blockedUserId],
      });
      void queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to block user");
    },
  });
};

// Hook for unblocking users
export const useUnblockUser = () => {
  useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blockedUserId: string) =>
      safetyAPI.unblockUser(null, blockedUserId),
    onSuccess: (_, blockedUserId) => {
      showSuccessToast("User unblocked successfully");
      void queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      void queryClient.invalidateQueries({
        queryKey: ["blockStatus", blockedUserId],
      });
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to unblock user");
    },
  });
};

// Hook for fetching blocked users
export const useBlockedUsers = () => {
  useAuthContext();

  return useQuery({
    queryKey: ["blockedUsers"],
    queryFn: async () => {
      const result = await safetyAPI.getBlockedUsers(null);
      return result.blockedUsers;
    },
  });
};

// Hook for checking if a user is blocked (matching mobile app pattern)
export const useBlockStatus = (
  input: string | { profileId?: string; userId?: string },
) => {
  useAuthContext();

  const params: { profileId?: string; userId?: string } =
    typeof input === "string" ? { userId: input } : input;

  const key = params.profileId ?? params.userId ?? "unknown";
  return useQuery({
    queryKey: ["blockStatus", key],
    queryFn: () => safetyAPI.checkBlockStatus(null, params),
    enabled: !!params.profileId || !!params.userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Combined hook for safety actions (matching mobile app structure)
export const useSafety = () => {
  useAuthContext();
  const reportUser = useReportUser();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const { data: blockedUsers, isLoading: isLoadingBlocked } = useBlockedUsers();

  const blockedUserIds =
    blockedUsers?.map((blocked) => blocked.blockedUserId) || [];

  const checkIfBlocked = async (userId: string): Promise<boolean> => {
    try {
      const result = await safetyAPI.checkBlockStatus(null, userId);
      return result.isBlocked;
    } catch {
      return false;
    }
  };

  const loadBlockedUsers = async (): Promise<void> => {
    await safetyAPI.getBlockedUsers(null);
  };

  return {
    // Data
    blockedUsers: blockedUsers || [],

    // Loading states
    loading: isLoadingBlocked,
    reporting: reportUser.isPending,
    blocking: blockUser.isPending,

    // Actions (async versions matching mobile)
    reportUser: async (
      userId: string,
      reason: ReportReason,
      description?: string,
    ): Promise<boolean> => {
      try {
        await reportUser.mutateAsync({
          reportedUserId: userId,
          reason,
          description,
        });
        return true;
      } catch {
        return false;
      }
    },
    blockUser: async (userId: string): Promise<boolean> => {
      try {
        await blockUser.mutateAsync(userId);
        return true;
      } catch {
        return false;
      }
    },
    unblockUser: async (userId: string): Promise<boolean> => {
      try {
        await unblockUser.mutateAsync(userId);
        return true;
      } catch {
        return false;
      }
    },
    checkIfBlocked,
    loadBlockedUsers,

    // Computed values
    isUserBlocked: (userId: string) => {
      return blockedUserIds.includes(userId);
    },
    blockedUserIds,
  };
};
