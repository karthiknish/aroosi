"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionAPI } from "@/lib/api/subscription";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import { useAuthContext } from "@/components/ClerkAuthProvider";
import {
  SubscriptionErrorHandler,
} from "@/lib/utils/subscriptionErrorHandler";

export const useSubscriptionStatus = (_providedToken?: string) => {
  // Cookie-based auth; no token needed
  useAuthContext();
  return useQuery({
    queryKey: ["subscription", "status"],
    // Pass undefined to satisfy types while ignoring token on server
    queryFn: () => subscriptionAPI.getStatus(undefined),
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUsageStats = () => {
  return useQuery({
    queryKey: ["subscription", "usage"],
    queryFn: () => subscriptionAPI.getUsage(undefined),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useSubscriptionActions = () => {
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionAPI.cancel(undefined),
    onSuccess: (data) => {
      showSuccessToast(data.message);
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: (error: Error) => {
      // Normalize arbitrary thrown error into a SubscriptionError
      const normalized =
        error && typeof (error as any).type === "string"
          ? (error as any)
          : {
              type: SubscriptionErrorHandler.parseErrorCode(
                (error as any)?.code || undefined
              ),
              message:
                (error as any)?.message ||
                "Subscription action failed. Please try again.",
            };
      showErrorToast(
        SubscriptionErrorHandler.toUserMessage(normalized)
      );
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: (tier: "premium" | "premiumPlus") =>
      subscriptionAPI.upgrade(tier, undefined),
    onSuccess: (data) => {
      showSuccessToast(data.message);
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: (error: Error) => {
      const normalized =
        error && typeof (error as any).type === "string"
          ? (error as any)
          : {
              type: SubscriptionErrorHandler.parseErrorCode(
                (error as any)?.code || undefined
              ),
              message:
                (error as any)?.message ||
                "Subscription upgrade failed. Please try again.",
            };
      showErrorToast(
        SubscriptionErrorHandler.toUserMessage(normalized)
      );
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => subscriptionAPI.restorePurchases(undefined),
    onSuccess: (data) => {
      showSuccessToast(data.message);
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: (error: Error) => {
      const normalized =
        error && typeof (error as any).type === "string"
          ? (error as any)
          : {
              type: SubscriptionErrorHandler.parseErrorCode(
                (error as any)?.code || undefined
              ),
              message:
                (error as any)?.message ||
                "Restore purchases failed. Please try again.",
            };
      showErrorToast(
        SubscriptionErrorHandler.toUserMessage(normalized)
      );
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
    // Expose per-action pending flags for finer UI control
    cancelPending: cancelMutation.isPending,
    upgradePending: upgradeMutation.isPending,
    restorePending: restoreMutation.isPending,
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

      const typedUsage = usage as {
        isUnlimited?: boolean;
        remainingQuota?: number;
      };
      if (typedUsage.isUnlimited) return true;
      return Boolean(
        typedUsage.remainingQuota && typedUsage.remainingQuota > 0,
      );
    },
    [usageCache],
  );

  return {
    trackUsage,
    checkLimit,
    getUsage: (feature: string) => usageCache[feature],
  };
};

export const useSubscriptionGuard = () => {
  const { data: status } = useSubscriptionStatus();

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
    [isActive, isPremium, isPremiumPlus],
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
