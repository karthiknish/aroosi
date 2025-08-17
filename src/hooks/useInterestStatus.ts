import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sendInterest, removeInterest, getSentInterests } from "@/lib/interestUtils";
import { showErrorToast, showSuccessToast } from "@/lib/ui/toast";

export type InterestLightStatus = "none" | "pending" | "accepted" | "rejected" | "mutual" | undefined;

interface UseInterestOptions {
  fromUserId?: string | null;
  toUserId?: string | null;
  enabled?: boolean;
  track?: (evt: { feature: string; metadata?: Record<string, any> }) => void;
}

export function useInterestStatus({ fromUserId, toUserId, enabled = true, track }: UseInterestOptions) {
  const queryClient = useQueryClient();
  const [localInterest, setLocalInterest] = useState<null | boolean>(null);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);

  const { data: interestStatusData, isLoading: loadingInterestStatus, refetch: refetchInterestStatus } = useQuery<{ status?: InterestLightStatus } | null>({
    queryKey: ["interestStatus", fromUserId, toUserId],
    queryFn: async () => {
      if (!fromUserId || !toUserId) return null;
      const url = `/api/interests/status?targetUserId=${encodeURIComponent(String(toUserId))}`;
      try {
        const mod = await import("@/lib/http/client");
        const data = await mod.getJson<any>(url, {
          cache: "no-store",
          headers: { "x-client-check": "interest-status" },
        });
        return data && typeof data === "object" ? (data as any) : null;
      } catch {
        return null;
      }
    },
    enabled: !!fromUserId && !!toUserId && enabled,
    staleTime: 30000,
  });

  const { data: sentInterests, isLoading: loadingInterests, refetch: refetchSentInterests } = useQuery<any[]>({
    queryKey: ["sentInterests", fromUserId],
    queryFn: async () => {
      if (!fromUserId) return [];
      const res = await getSentInterests();
      const payload: unknown = res && typeof res === "object" && "data" in (res as any) ? (res as any).data : res;
      return Array.isArray(payload) ? payload : [];
    },
    enabled: !!fromUserId && enabled,
    retry: false,
  });

  const alreadySentInterest = useMemo(() => {
    if (localInterest !== null) return localInterest;
    if (interestStatusData && typeof interestStatusData === "object" && "status" in interestStatusData) {
      const s = (interestStatusData as { status?: string }).status as InterestLightStatus;
      if (s === "pending" || s === "accepted") return true;
      if (s === "mutual" || s === "rejected") return false;
    }
    if (!sentInterests || !Array.isArray(sentInterests)) return false;
    return sentInterests.some((i: any) => i.toUserId === toUserId && i.fromUserId === fromUserId && i.status !== "rejected");
  }, [localInterest, interestStatusData, sentInterests, toUserId, fromUserId]);

  const handleToggleInterest = async () => {
    if (!fromUserId || !toUserId) {
      showErrorToast(null, "User IDs not available");
      return;
    }
    setInterestError(null);
    try {
      if (alreadySentInterest) {
        setLocalInterest(false);
        await removeInterest(String(toUserId));
        showSuccessToast("Interest withdrawn successfully!");
      } else {
        setLocalInterest(true);
        setShowHeartPop(true);
        await sendInterest(String(toUserId));
        showSuccessToast("Interest sent successfully!");
        track?.({ feature: "interest_sent", metadata: { targetUserId: toUserId } });
      }
      void queryClient.invalidateQueries({ queryKey: ["interestStatus", fromUserId, toUserId] });
      void queryClient.invalidateQueries({ queryKey: ["sentInterests", fromUserId] });
      void queryClient.invalidateQueries({ queryKey: ["matches", "self"] });
      void queryClient.invalidateQueries({ queryKey: ["unreadCounts", "self"] });
      await Promise.all([refetchInterestStatus(), refetchSentInterests()]);
      setLocalInterest(null);
      if (!alreadySentInterest) setTimeout(() => setShowHeartPop(false), 600);
      else setShowHeartPop(false);
    } catch (e: any) {
      setLocalInterest(null);
      const msg = e?.message || (alreadySentInterest ? "Failed to remove interest" : "Failed to send interest");
      showErrorToast(msg);
      setInterestError(msg);
    }
  };

  return {
    interestStatusData,
    loadingInterestStatus,
    sentInterests,
    loadingInterests,
    alreadySentInterest,
    handleToggleInterest,
    showHeartPop,
    interestError,
    setInterestError,
  };
}
