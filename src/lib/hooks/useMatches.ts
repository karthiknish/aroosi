import { useQuery } from "@tanstack/react-query";
import type { Profile } from "@/types/profile";
import { useUnreadCounts } from "./useUnreadCounts";

export function useMatches(
  userId: string | undefined,
  token: string | undefined,
  search: string
) {
  // fetch matches list via cookie-auth; server infers user from session
  const { data: matches = [], isLoading: loading } = useQuery<Profile[]>({
    queryKey: ["matches", /* user inferred by cookie */ "self"],
    queryFn: async () => {
      const res = await fetch(`/api/matches`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      const data = await res.json().catch(() => ({} as any));
      // New API shape returns { success, matches }
      if (data && typeof data === "object" && Array.isArray(data.matches)) {
        return data.matches as Profile[];
      }
      // Back-compat if endpoint returns array directly
      if (Array.isArray(data)) return data as Profile[];
      return [];
    },
    // Enable regardless of token; rely on cookie session. Only require app-level userId presence if desired.
    enabled: true,
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
