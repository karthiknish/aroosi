import { useQuery } from "@tanstack/react-query";

export function useUnreadCounts(
  userId: string | undefined,
  token: string | undefined
) {
  return useQuery<Record<string, number>>({
    // Cookie-auth; user inferred server-side. Include 'self' key to avoid churn.
    queryKey: ["unreadCounts", "self"],
    queryFn: async () => {
      const res = await fetch(`/api/matches/unread`, {
        credentials: "include",
      });
      if (!res.ok) return {};
      const data = await res.json().catch(() => ({} as any));
      if (data && typeof data === "object" && data.counts && typeof data.counts === "object") {
        return data.counts as Record<string, number>;
      }
      return {};
    },
    enabled: true,
    refetchInterval: 10000, // poll every 10s
  });
}
