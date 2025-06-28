'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { safetyAPI, type ReportData, type ReportReason } from '@/lib/api/safety';
import { showSuccessToast, showErrorToast } from '@/lib/ui/toast';
import { useAuthContext } from "@/components/AuthProvider";

// Hook for reporting users
export const useReportUser = () => {
  const { token } = useAuthContext();

  return useMutation({
    mutationFn: (data: ReportData) => safetyAPI.reportUser(token, data),
    onSuccess: () => {
      showSuccessToast(
        "User reported successfully. Our team will review this report."
      );
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to report user");
    },
  });
};

// Hook for blocking users
export const useBlockUser = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blockedUserId: string) =>
      safetyAPI.blockUser(token, blockedUserId),
    onSuccess: (_, blockedUserId) => {
      showSuccessToast("User blocked successfully");
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({
        queryKey: ["blockStatus", blockedUserId],
      });
      queryClient.invalidateQueries({ queryKey: ["profiles"] }); // Refresh search results
    },
    onError: (error: Error) => {
      showErrorToast(error, "Failed to block user");
    },
  });
};

// Hook for unblocking users
export const useUnblockUser = () => {
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blockedUserId: string) =>
      safetyAPI.unblockUser(token, blockedUserId),
    onSuccess: (_, blockedUserId) => {
      showSuccessToast("User unblocked successfully");
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({
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
  const { token } = useAuthContext();

  return useQuery({
    queryKey: ["blockedUsers"],
    queryFn: async () => {
      const result = await safetyAPI.getBlockedUsers(token);
      return result.blockedUsers;
    },
  });
};

// Hook for checking if a user is blocked (matching mobile app pattern)
export const useBlockStatus = (userId: string) => {
  const { token } = useAuthContext();

  return useQuery({
    queryKey: ["blockStatus", userId],
    queryFn: () => safetyAPI.checkBlockStatus(token, userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Combined hook for safety actions (matching mobile app structure)
export const useSafety = () => {
  const { token } = useAuthContext();
  const reportUser = useReportUser();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const { data: blockedUsers, isLoading: isLoadingBlocked } = useBlockedUsers();

  const blockedUserIds =
    blockedUsers?.map((blocked) => blocked.blockedUserId) || [];

  const checkIfBlocked = async (userId: string): Promise<boolean> => {
    try {
      const result = await safetyAPI.checkBlockStatus(token, userId);
      return result.isBlocked;
    } catch {
      return false;
    }
  };

  const loadBlockedUsers = async (): Promise<void> => {
    // Force refetch of blocked users
    await safetyAPI.getBlockedUsers(token);
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
      description?: string
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