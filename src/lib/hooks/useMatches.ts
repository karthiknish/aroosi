import { useQuery } from "@tanstack/react-query";
import type { Profile } from "@/types/profile";
import { useUnreadCounts } from "./useUnreadCounts";

export function useMatches(
  userId: string | undefined,
  token: string | undefined,
  search: string
) {
  // fetch matches list
  const { data: matches = [], isLoading: loading } = useQuery<Profile[]>({
    queryKey: ["matches", userId, token],
    queryFn: async () => {
      if (!userId || !token) return [];
      const res = await fetch(`/api/matches?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: Boolean(userId && token),
  });

  const { data: counts = {} } = useUnreadCounts(userId, token);

  // filter by search
  const term = search.trim().toLowerCase();
  const filtered = matches.filter((p) =>
    term
      ? p.fullName?.toLowerCase().includes(term) ||
        p.city?.toLowerCase().includes(term)
      : true
  );

  // attach unreadCount
  const withUnread = filtered.map((p) => ({
    ...p,
    unread: counts[p.userId] || 0,
  }));

  return { matches: withUnread, loading };
}
