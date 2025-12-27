import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { matchesAPI } from "@/lib/api/matches";

export function useUnreadCounts(
  userId: string | undefined,
  _token: string | undefined
) {
  return useQuery<Record<string, number>>({
    queryKey: ["unreadCounts", userId || "self"],
    queryFn: async () => {
      if (!userId && !auth.currentUser) {
        return {};
      }
      try {
        return await matchesAPI.getUnreadCounts();
      } catch {
        return {};
      }
    },
    enabled: !!userId,
    refetchInterval: 30000, // Increased from 10s to 30s to reduce API load
    staleTime: 15000, // Increased from 5s to 15s
  });
}
