import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sendInterest, removeInterest } from "@/lib/interestUtils";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

export type InterestLightStatus =
  | "none"
  | "pending"
  | "accepted"
  | "rejected"
  | "mutual"
  | undefined;

interface UseInterestOptions {
  fromUserId?: string | null;
  toUserId?: string | null;
  enabled?: boolean;
  track?: (evt: { feature: string; metadata?: Record<string, any> }) => void;
}

export function useInterestStatus({
  fromUserId,
  toUserId,
  enabled = true,
  track,
}: UseInterestOptions) {
  const queryClient = useQueryClient();
  const [localInterest, setLocalInterest] = useState<null | boolean>(null);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);
  const [mutationPending, setMutationPending] = useState(false);
  // Track if we've applied initial status to prevent overwriting user toggles
  const initializedFromRemote = useRef(false);

  const {
    data: interestStatusData,
    isLoading: loadingInterestStatus,
    refetch: refetchInterestStatus,
  } = useQuery<{ status: InterestLightStatus | null } | null>({
    queryKey: ["interestStatus", fromUserId, toUserId],
    queryFn: async () => {
      if (!fromUserId || !toUserId) return null;
      // Prefer dedicated status endpoint which infers direction using targetUserId; fall back to legacy mode param route
      const primaryUrl = `/api/interests/status?targetUserId=${encodeURIComponent(
        String(toUserId)
      )}`;
      const fallbackUrl = `/api/interests?mode=status&userId=${encodeURIComponent(
        String(toUserId)
      )}`;
      try {
        const mod = await import("@/lib/http/client");
        let raw: any = await mod.getJson<any>(primaryUrl, {
          cache: "no-store",
          headers: { "x-client-check": "interest-status" },
        });
        // Unwrap { success, data: { status } } pattern
        if (
          raw &&
          typeof raw === "object" &&
          raw.success &&
          raw.data &&
          typeof raw.data === "object" &&
          "status" in raw.data
        ) {
          raw = { status: raw.data.status };
        }
        if (!raw || typeof raw !== "object" || !("status" in raw)) {
          const fb: any = await mod.getJson<any>(fallbackUrl, {
            cache: "no-store",
            headers: { "x-client-check": "interest-status-fallback" },
          });
          if (
            fb &&
            typeof fb === "object" &&
            fb.success &&
            fb.data &&
            typeof fb.data === "object" &&
            "status" in fb.data
          ) {
            raw = { status: fb.data.status };
          } else {
            raw = fb;
          }
        }
        const normalized: { status: InterestLightStatus | null } | null =
          raw && typeof raw === "object" && "status" in raw
            ? { status: (raw as any).status as InterestLightStatus | null }
            : null;
        if (typeof window !== "undefined") {
          (window as any).__interestDebugLastFetch = {
            ts: Date.now(),
            fromUserId,
            toUserId,
            primaryUrl,
            usedFallback: normalized && raw && raw._legacy === true,
            raw,
            normalized,
          };
        }
        return normalized;
      } catch (e) {
        if (typeof window !== "undefined") {
          (window as any).__interestDebugLastFetchError = {
            ts: Date.now(),
            fromUserId,
            toUserId,
            error: (e as any)?.message,
          };
        }
        return null;
      }
    },
    enabled: !!fromUserId && !!toUserId && fromUserId !== toUserId && enabled,
    staleTime: 30000,
    retry: 2,
    retryDelay: (attempt) => 250 * (attempt + 1),
  });
  const alreadySentInterest = useMemo(() => {
    if (localInterest !== null) return localInterest;
      const s = interestStatusData?.status || null;
    if (!s) return false;
    return ["pending", "accepted", "mutual", "reciprocated"].includes(s);
  }, [localInterest, interestStatusData]);

  // Initialize localInterest once based on remote status so UI renders correctly on first paint
  useEffect(() => {
    if (!initializedFromRemote.current && interestStatusData) {
      const s = interestStatusData.status;
      if (s && ["pending", "accepted", "mutual", "reciprocated"].includes(s)) {
        setLocalInterest(true);
      } else if (s === "none" || s == null) {
        setLocalInterest(false);
      }
      initializedFromRemote.current = true;
    }
  }, [interestStatusData]);

  // If enabled conditions become true but we still have no data after initial run, schedule a gentle refetch.
  useEffect(() => {
    if (
      fromUserId &&
      toUserId &&
      fromUserId !== toUserId &&
      enabled &&
      !loadingInterestStatus &&
      !interestStatusData &&
      !initializedFromRemote.current
    ) {
      if (typeof window !== "undefined") {
        (window as any).__interestDebugLifecycle = (
          (window as any).__interestDebugLifecycle || []
        ).slice(-20);
        (window as any).__interestDebugLifecycle.push({
          ts: Date.now(),
          phase: "schedule_refetch_due_to_null_status",
          fromUserId,
          toUserId,
        });
      }
      const t = setTimeout(() => {
        void refetchInterestStatus();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [
    fromUserId,
    toUserId,
    enabled,
    loadingInterestStatus,
    interestStatusData,
    refetchInterestStatus,
  ]);

  const handleToggleInterest = async () => {
    if (!fromUserId || !toUserId) {
      showErrorToast(null, "User IDs not available");
      return;
    }
    if (mutationPending) return;
    setInterestError(null);
    setMutationPending(true);
    const wasSentBeforeClick = alreadySentInterest; // capture pre-click state
    // Debug snapshot
    if (typeof window !== "undefined") {
      (window as any).__interestDebugLastAction = {
        ts: Date.now(),
        fromUserId,
        toUserId,
        alreadySentBeforeClick: alreadySentInterest,
      };
    }
    try {
      if (wasSentBeforeClick) {
        setLocalInterest(false);
        queryClient.setQueryData(["interestStatus", fromUserId, toUserId], {
          status: "none",
        });
        await removeInterest(String(toUserId));
        showSuccessToast("Interest withdrawn successfully!");
      } else {
        setLocalInterest(true);
        setShowHeartPop(true);
        queryClient.setQueryData(["interestStatus", fromUserId, toUserId], {
          status: "pending",
        });
        await sendInterest(String(toUserId));
        showSuccessToast("Interest sent successfully!");
        track?.({
          feature: "interest_sent",
          metadata: { targetUserId: toUserId },
        });
      }
      void queryClient.invalidateQueries({
        queryKey: ["interestStatus", fromUserId, toUserId],
      });
      void queryClient.invalidateQueries({ queryKey: ["matches", "self"] });
      void queryClient.invalidateQueries({
        queryKey: ["unreadCounts", "self"],
      });
      // Ensure any sentInterests-based UIs (e.g., Search filtering) refresh immediately
      void queryClient.invalidateQueries({ queryKey: ["sentInterests"] });
      const refetchResult = await refetchInterestStatus();
      // Maintain optimistic state until server confirms expected transition to avoid UI flicker
      if (!wasSentBeforeClick) {
        // We just sent an interest; if server hasn't materialized doc yet, keep optimistic true
        const serverStatus = (refetchResult.data as any)?.status as
          | InterestLightStatus
          | null
          | undefined;
        if (serverStatus == null) {
          // schedule another silent refetch shortly
          setTimeout(() => {
            void refetchInterestStatus();
          }, 400);
          // keep local optimistic true
        } else {
          setLocalInterest(null);
        }
        setTimeout(() => setShowHeartPop(false), 600);
      } else {
        // We withdrew interest; if server still reports a status, retry once then clear optimistic flag
        const serverStatus = (refetchResult.data as any)?.status as
          | InterestLightStatus
          | null
          | undefined;
        if (serverStatus && serverStatus !== "none" && serverStatus !== null) {
          setTimeout(() => {
            void refetchInterestStatus();
          }, 300);
        }
        setLocalInterest(null);
        setShowHeartPop(false);
      }
    } catch (e: any) {
      const status = (e as any)?.status;
      // Gracefully treat duplicate send (409) as success: keep optimistic state
      if (!wasSentBeforeClick && status === 409) {
        // Ensure cache shows pending (already sent)
        setLocalInterest(true);
        queryClient.setQueryData(["interestStatus", fromUserId, toUserId], {
          status: "pending",
        });
        // Silent refetch to reconcile real status
        setTimeout(() => {
          void refetchInterestStatus();
        }, 250);
        setShowHeartPop(false);
        setMutationPending(false);
        return; // Suppress error toast
      }
      setLocalInterest(null);
      await refetchInterestStatus();
      const msg =
        e?.message ||
        (wasSentBeforeClick
          ? "Failed to remove interest"
          : "Failed to send interest");
      showErrorToast(msg);
      setInterestError(msg);
      setShowHeartPop(false);
    }
    setMutationPending(false);
  };

  return {
    interestStatusData,
    loadingInterestStatus,
    sentInterests: undefined,
    loadingInterests: false,
    alreadySentInterest,
    handleToggleInterest,
    showHeartPop,
    interestError,
    setInterestError,
    mutationPending,
  };
}
