"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionAPI } from "@/lib/api/subscription";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";

export const useSubscriptionStatus = (token?: string) => {
  return useQuery({
    queryKey: ["subscription", "status", token],
    queryFn: () => subscriptionAPI.getStatus(token),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUsageStats = (token?: string) => {
  return useQuery({
    queryKey: ["subscription", "usage", token],
    queryFn: () => subscriptionAPI.getUsage(token),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useSubscriptionActions = (token?: string) => {
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionAPI.cancel(token),
    onSuccess: (data) => {
      showSuccessToast(data.message);
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to cancel subscription");
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: (tier: "premium" | "premiumPlus") =>
      subscriptionAPI.upgrade(tier, token),
    onSuccess: (data) => {
      showSuccessToast(data.message);
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to upgrade subscription");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => subscriptionAPI.restorePurchases(token),
    onSuccess: (data) => {
      showSuccessToast(data.message);
      if (data.restored) {
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
      }
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to restore purchases");
    },
  });

  return {
    cancel: cancelMutation.mutate,
    upgrade: upgradeMutation.mutate,
    restore: restoreMutation.mutate,
    isLoading:
      cancelMutation.isPending ||
      upgradeMutation.isPending ||
      restoreMutation.isPending,
  };
};

export const useFeatureUsage = () => {
  const [usageCache, setUsageCache] = useState<Record<string, unknown>>({});

  const trackUsage = useCallback(async (feature: string) => {
    try {
      const result = await subscriptionAPI.trackUsage(feature);
      setUsageCache((prev) => ({
        ...prev,
        [feature]: result,
      }));
      return result;
    } catch (error) {
      console.error("Failed to track usage:", error);
      throw error;
    }
  }, []);

  const checkLimit = useCallback(
    (feature: string): boolean => {
      const usage = usageCache[feature];
      if (!usage) return true; // Allow if we don't have usage data yet

      const typedUsage = usage as { isUnlimited?: boolean; remainingQuota?: number };
      if (typedUsage.isUnlimited) return true;
      return Boolean(typedUsage.remainingQuota && typedUsage.remainingQuota > 0);
    },
    [usageCache]
  );

  return {
    trackUsage,
    checkLimit,
    getUsage: (feature: string) => usageCache[feature],
  };
};

export const useSubscriptionGuard = (token?: string) => {
  const { data: status } = useSubscriptionStatus(token);

  const isPremium =
    status?.plan === "premium" || status?.plan === "premiumPlus";
  const isPremiumPlus = status?.plan === "premiumPlus";
  const isActive = status?.isActive ?? false;

  const canAccess = useCallback(
    (requiredTier: "premium" | "premiumPlus") => {
      if (!isActive) return false;

      if (requiredTier === "premium") {
        return isPremium;
      }

      if (requiredTier === "premiumPlus") {
        return isPremiumPlus;
      }

      return false;
    },
    [isActive, isPremium, isPremiumPlus]
  );

  const requiresPremium = useCallback((feature: string) => {
    const premiumFeatures = [
      "unlimited_messaging",
      "advanced_filters",
      "priority_support",
    ];
    return premiumFeatures.includes(feature);
  }, []);

  const requiresPremiumPlus = useCallback((feature: string) => {
    const premiumPlusFeatures = [
      "profile_boost",
      "profile_viewers",
      "spotlight_badge",
      "unlimited_voice_messages",
    ];
    return premiumPlusFeatures.includes(feature);
  }, []);

  return {
    status,
    isPremium,
    isPremiumPlus,
    isActive,
    canAccess,
    requiresPremium,
    requiresPremiumPlus,
  };
};
