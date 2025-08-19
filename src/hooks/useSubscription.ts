"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subscriptionAPI } from "@/lib/api/subscription";
import { showSuccessToast, showErrorToast } from "@/lib/ui/toast";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { SubscriptionErrorHandler } from "@/lib/utils/subscriptionErrorHandler";

export const useSubscriptionStatus = (_providedToken?: string) => {
  // Access auth context for profile + refresh capability (cookie-based auth; no token required)
  const { profile, refreshProfile } = useAuthContext();

  // Detect success redirect params to temporarily lower stale time & add polling
  let quickRefresh = false;
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const checkoutSuccess = params.get("checkout") === "success";
    const legacySubscriptionSuccess = params.get("subscription") === "success"; // backward compat (old query param)
    quickRefresh = checkoutSuccess || legacySubscriptionSuccess;
  }

  const query = useQuery({
    queryKey: ["subscription", "status"],
    queryFn: () => subscriptionAPI.getStatus(undefined),
    enabled: true,
    staleTime: quickRefresh ? 5_000 : 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: quickRefresh ? 5_000 : false,
    refetchOnWindowFocus: quickRefresh,
  });

  // After an upgrade the subscription status (React Query) will show the new plan immediately
  // (or shortly after webhook), but the cached user profile context (Firestore doc) remains stale
  // until the next auth/profile refresh. To keep UI elements that rely on profile.subscriptionPlan
  // (e.g. Header, guards) in sync, trigger a one-time refresh when we detect a mismatch.
  const lastSyncedPlanRef = useRef<string | null>(null);
  useEffect(() => {
    const statusPlan = query.data?.plan;
    const profilePlan = (profile as any)?.subscriptionPlan || "free";
    if (
      statusPlan &&
      statusPlan !== profilePlan &&
      lastSyncedPlanRef.current !== statusPlan
    ) {
      lastSyncedPlanRef.current = statusPlan;
      try {
        refreshProfile();
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.debug("[useSubscriptionStatus] refreshProfile failed", e);
        }
      }
    }
  }, [query.data?.plan, profile?.subscriptionPlan, refreshProfile]);

  /**
   * Additional upgrade reconciliation & success UX
   * - Detect upward plan transitions (free -> premium / premiumPlus, premium -> premiumPlus)
   * - Poll profile refresh briefly after checkout success until Firestore reflects new plan
   * - Fallback to calling /api/subscription/refresh once if mismatch persists (server reconciliation)
   * - Emit a one‑time success toast when upgrade becomes effective client side
   */
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingAttemptsRef = useRef(0);
  const lastToastPlanRef = useRef<string | null>(null);
  const lastStatusPlanRef = useRef<string | null>(null);

  // Rank helper for upward comparison
  const planRank = useCallback((p: string) => {
    switch (p) {
      case "premiumPlus":
        return 3;
      case "premium":
        return 2;
      case "free":
      default:
        return 1;
    }
  }, []);

  useEffect(() => {
    const statusPlan = query.data?.plan || "free";
    const profilePlan = (profile as any)?.subscriptionPlan || "free";

    // Detect new status plan change
    if (statusPlan !== lastStatusPlanRef.current) {
      lastStatusPlanRef.current = statusPlan;
    }

    // Show success toast whenever both sources align on an upgraded (non-free) plan and we haven't toasted yet
    if (
      statusPlan === profilePlan &&
      statusPlan !== "free" &&
      lastToastPlanRef.current !== statusPlan
    ) {
      showSuccessToast(
        statusPlan === "premiumPlus"
          ? "Your Premium Plus subscription is active. Enjoy all features!"
          : "Your Premium subscription is active. Enjoy your new features!"
      );
      lastToastPlanRef.current = statusPlan;
    }

    // If status shows upgrade but profile hasn't caught up yet, start short polling (only when quickRefresh context)
    const upgradedButMismatch =
      planRank(statusPlan) > planRank(profilePlan) &&
      statusPlan !== profilePlan;
    if (quickRefresh && upgradedButMismatch && !pollingRef.current) {
      pollingAttemptsRef.current = 0;
      pollingRef.current = setInterval(async () => {
        pollingAttemptsRef.current += 1;
        try {
          await refreshProfile();
        } catch {}
        const latestProfilePlan = ((): string => {
          try {
            return ((profile as any)?.subscriptionPlan || "free") as string;
          } catch {
            return "free";
          }
        })();
        if (latestProfilePlan === statusPlan) {
          // Success: stop polling & toast if not already
          if (
            lastToastPlanRef.current !== statusPlan &&
            statusPlan !== "free"
          ) {
            showSuccessToast(
              statusPlan === "premiumPlus"
                ? "Your Premium Plus subscription is active. Enjoy all features!"
                : "Your Premium subscription is active. Enjoy your new features!"
            );
            lastToastPlanRef.current = statusPlan;
          }
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else if (pollingAttemptsRef.current === 3) {
          // After a few attempts, ask server to reconcile explicitly (may populate expiresAt, etc)
          try {
            await fetch("/api/subscription/refresh", { method: "POST" });
          } catch {}
        } else if (pollingAttemptsRef.current > 10) {
          // Give up after ~10 attempts (~20s if interval 2s)
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      }, 2000);
    }

    // If mismatch resolved or conditions no longer valid, clear polling
    if (!upgradedButMismatch && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [
    quickRefresh,
    query.data?.plan,
    profile?.subscriptionPlan,
    planRank,
    refreshProfile,
    profile,
  ]);

  return query;
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
  // Pull admin flag from auth context (already invoked inside useSubscriptionStatus for token purposes)
  const { isAdmin } = useAuthContext();

  // Admins implicitly have the highest tier and active subscription state
  const isPremium =
    isAdmin || status?.plan === "premium" || status?.plan === "premiumPlus";
  const isPremiumPlus = isAdmin || status?.plan === "premiumPlus";
  // Ensure operator precedence is explicit
  const isActive = isAdmin || (status?.isActive ?? false);

  const canAccess = useCallback(
    (requiredTier: "premium" | "premiumPlus") => {
      if (isAdmin) return true; // short‑circuit for admins
      if (!isActive) return false;

      if (requiredTier === "premium") {
        return isPremium;
      }

      if (requiredTier === "premiumPlus") {
        return isPremiumPlus;
      }

      return false;
    },
    [isAdmin, isActive, isPremium, isPremiumPlus]
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
    isAdmin,
    isPremium,
    isPremiumPlus,
    isActive,
    canAccess,
    requiresPremium,
    requiresPremiumPlus,
  };
};
