import { useQuery } from "@tanstack/react-query";

export function useUnreadCounts(
  userId: string | undefined,
  token: string | undefined
) {
  return useQuery<Record<string, number>>({
    queryKey: ["unreadCounts", userId, token],
    queryFn: async () => {
      if (!userId || !token) return {};
      const res = await fetch(`/api/matches/unread?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return {};
      const data = await res.json();
      return data.counts || {};
    },
    enabled: Boolean(userId && token),
    refetchInterval: 10000, // poll every 10s
  });
}
