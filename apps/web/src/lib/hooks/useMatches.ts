import { useQuery } from "@tanstack/react-query";
import type { Profile } from "@aroosi/shared/types";
import { useUnreadCounts } from "./useUnreadCounts";
import { showErrorToast } from "@/lib/ui/toast";
import { matchesAPI } from "@/lib/api/matches";

export function useMatches(
  userId: string | undefined,
  token: string | undefined,
  search: string
) {
  // fetch matches list via cookie-auth; server infers user from session
  const { data: matches = [], isLoading: loading } = useQuery<Profile[], Error>(
    {
      queryKey: ["matches", /* user inferred by cookie */ "self"],
      queryFn: async (): Promise<Profile[]> => {
        try {
          const res = await matchesAPI.getMatches();
          // This endpoint returns a minimal Profile-like shape; cast to Profile for consumers.
          return res as unknown as Profile[];
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Failed to fetch matches";
          showErrorToast?.(msg);
          return [];
        }
      },
      enabled: true,
    }
  );

  const { data: counts = {} } = useUnreadCounts(userId, token);

  // filter by search
  const term = (search || "").trim().toLowerCase();
  const filtered: Profile[] = (matches as Profile[]).filter((p: Profile) =>
    term
      ? (p.fullName ?? "").toLowerCase().includes(term) ||
        (p.city ?? "").toLowerCase().includes(term)
      : true
  );

  // attach unreadCount
  const withUnread = filtered.map((p: Profile) => ({
    ...p,
    unread: (counts as Record<string, number>)[p.userId] || 0,
  }));

  return { matches: withUnread, loading };
}
