import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/components/AuthProvider";
import { useSubscriptionStatus } from "@/hooks/useSubscription";
import {
  showErrorToast,
  showWarningToast,
  showInfoToast,
} from "@/lib/ui/toast";

type Feature =
  | "message_sent"
  | "profile_view"
  | "search_performed"
  | "interest_sent"
  | "profile_boost_used"
  | "voice_message_sent";

interface TrackUsageParams {
  feature: Feature;
  metadata?: {
    targetUserId?: string;
    searchQuery?: string;
    messageType?: string;
  };
}

interface UsageResponse {
  feature: string;
  plan: string;
  tracked: boolean;
  currentUsage: number;
  limit: number;
  remainingQuota: number;
  isUnlimited: boolean;
  resetDate: number;
}

export function useUsageTracking(providedToken?: string): {
  trackUsage: (params: TrackUsageParams) => void;
  isTracking: boolean;
} {
  const { token: contextToken } = useAuthContext();
  const queryClient = useQueryClient();
  const { data: subscription } = useSubscriptionStatus(
    (providedToken ?? undefined) || (contextToken ?? undefined),
  );

  const trackUsage = useMutation({
    mutationFn: async ({ feature, metadata }: TrackUsageParams) => {
      const token = providedToken || contextToken;
      if (!token) throw new Error("No auth token available");
      const response = await fetch("/api/subscription/track-usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ feature, metadata }),
      });

      if (!response.ok) {
        let error: unknown;
        try {
          error = await response.json();
        } catch {
          error = {};
        }
        if (typeof error === "object" && error !== null && "error" in error) {
          throw new Error(
            (error as { error?: string }).error || "Failed to track usage",
          );
        }
        throw new Error("Failed to track usage");
      }

      const result: unknown = await response.json();
      if (
        typeof result === "object" &&
        result !== null &&
        "data" in result &&
        typeof (result as { data: unknown }).data === "object"
      ) {
        return result as { data: UsageResponse };
      }
      throw new Error("Unexpected response format");
    },
    onSuccess: (data) => {
      // Invalidate usage stats query to refresh the UI
      void queryClient.invalidateQueries({ queryKey: ["usage-stats"] });

      // Show warning if approaching limit
      const usage = data.data;
      if (
        !usage.isUnlimited &&
        usage.remainingQuota <= 5 &&
        usage.remainingQuota > 0
      ) {
        showWarningToast(
          `Only ${usage.remainingQuota} ${getFeatureName(usage.feature)} remaining this month`,
        );
      } else if (!usage.isUnlimited && usage.remainingQuota === 0) {
        showErrorToast(
          null,
          `Monthly limit reached for ${getFeatureName(usage.feature)}`,
        );
      }
    },
    onError: (error: Error) => {
      // If user is Premium/PremiumPlus, ignore limit errors coming from stale backend data
      if (
        subscription &&
        (subscription.plan === "premium" ||
          subscription.plan === "premiumPlus") &&
        error.message.toLowerCase().includes("limit")
      ) {
        // Silently ignore – treat as success and don't bother the user
        return;
      }

      if (error.message.includes("limit reached")) {
        showErrorToast(null, error.message);
        showInfoToast(
          "Upgrade to Premium for higher limits. Visit pricing page.",
        );
      } else {
        showErrorToast(null, error.message);
      }
    },
  });

  return {
    trackUsage: trackUsage.mutate,
    isTracking: trackUsage.isPending,
  };
}

export function useCanUseFeature(
  feature: Feature,
): ReturnType<typeof useQuery> {
  const { token: contextToken } = useAuthContext();

  return useQuery({
    queryKey: ["can-use-feature", feature],
    queryFn: async (): Promise<{ canUse: boolean; reason?: string }> => {
      const token = contextToken;
      const response = await fetch(`/api/subscription/can-use/${feature}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to check feature availability");
      }

      const result: unknown = await response.json();
      if (
        typeof result === "object" &&
        result !== null &&
        "canUse" in result &&
        typeof (result as { canUse: unknown }).canUse === "boolean"
      ) {
        return result as { canUse: boolean; reason?: string };
      }
      throw new Error("Unexpected response format");
    },
    staleTime: 30000, // Cache for 30 seconds
  });
}

function getFeatureName(feature: string): string {
  const names: Record<string, string> = {
    message_sent: "messages",
    profile_view: "profile views",
    search_performed: "searches",
    interest_sent: "interests",
    profile_boost_used: "profile boosts",
    voice_message_sent: "voice messages",
  };
  return names[feature] || feature;
}
