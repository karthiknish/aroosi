import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { interestsAPI } from "@/lib/api/interests";
import { handleApiOutcome, handleError } from "@/lib/utils/errorHandling";

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
  track?: (evt: { feature: string; metadata?: Record<string, unknown> }) => void;
}

type InterestStatusResponse = {
  data?: { status?: InterestLightStatus | null };
  status?: InterestLightStatus | null;
};

type InterestActionResponse = {
  alreadyMatched?: boolean;
  alreadyRemoved?: boolean;
  removed?: number;
  interestId?: string;
};

type InterestDebugWindow = Window & {
  __interestDebugLastFetch?: unknown;
  __interestDebugLastFetchError?: unknown;
  __interestDebugLifecycle?: Array<Record<string, unknown>>;
  __interestDebugLastAction?: unknown;
};

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
      try {
        const response = await interestsAPI.getStatus(String(toUserId)) as InterestStatusResponse;
        
        // Handle both { success, data: { status } } and { status } patterns
        const status = response?.data?.status ?? response?.status;
        
        const normalized: { status: InterestLightStatus | null } | null = {
          status: (status as InterestLightStatus) || null
        };

        if (typeof window !== "undefined") {
          (window as InterestDebugWindow).__interestDebugLastFetch = {
            ts: Date.now(),
            fromUserId,
            toUserId,
            response,
            normalized,
          };
        }
        return normalized;
      } catch (e) {
        if (typeof window !== "undefined") {
          (window as Window & { __interestDebugLastFetchError?: unknown }).__interestDebugLastFetchError = {
            ts: Date.now(),
            fromUserId,
            toUserId,
            error: e instanceof Error ? e.message : String(e),
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
        const debugWindow = window as InterestDebugWindow;
        debugWindow.__interestDebugLifecycle = (
          debugWindow.__interestDebugLifecycle || []
        ).slice(-20);
        debugWindow.__interestDebugLifecycle.push({
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
      handleApiOutcome({ success: false, error: "User IDs not available" });
      return;
    }
    if (mutationPending) return;
    setInterestError(null);
    setMutationPending(true);
    const wasSentBeforeClick = alreadySentInterest; // capture pre-click state
    // Debug snapshot
    if (typeof window !== "undefined") {
      (window as InterestDebugWindow).__interestDebugLastAction = {
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
        const removeResult = await interestsAPI.remove(
          String(toUserId)
        ) as InterestActionResponse;
        handleApiOutcome({
          success: true,
          message: "Interest withdrawn successfully!",
          warning: removeResult.alreadyRemoved
            ? "Interest was already withdrawn."
            : null,
        });
      } else {
        setLocalInterest(true);
        setShowHeartPop(true);
        queryClient.setQueryData(["interestStatus", fromUserId, toUserId], {
          status: "pending",
        });
        const sendResult = await interestsAPI.send(
          String(toUserId)
        ) as InterestActionResponse;
        handleApiOutcome({
          success: true,
          message: sendResult.alreadyMatched
            ? "You are already matched with this profile."
            : "Interest sent successfully!",
          warning: sendResult.alreadyMatched
            ? "You are already matched with this profile."
            : null,
        });
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
        const serverStatus = refetchResult.data?.status;
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
        const serverStatus = refetchResult.data?.status;
        if (serverStatus && serverStatus !== "none" && serverStatus !== null) {
          setTimeout(() => {
            void refetchInterestStatus();
          }, 300);
        }
        setLocalInterest(null);
        setShowHeartPop(false);
      }
    } catch (error: unknown) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? (error as { status?: number }).status
          : undefined;
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
        handleApiOutcome({
          success: true,
          warning: "Interest already sent.",
        });
        setShowHeartPop(false);
        setMutationPending(false);
        return; // Suppress error toast
      }
      setLocalInterest(null);
      await refetchInterestStatus();
      const msg =
        (error instanceof Error ? error.message : undefined) ||
        (wasSentBeforeClick
          ? "Failed to remove interest"
          : "Failed to send interest");
      handleError(
        error instanceof Error ? error : new Error(msg),
        {
          scope: "useInterestStatus",
          action: wasSentBeforeClick ? "remove_interest" : "send_interest",
          fromUserId,
          toUserId,
        },
        {
          customUserMessage: msg,
        }
      );
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
