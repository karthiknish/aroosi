import { useQuery } from "@tanstack/react-query";
import type { Profile } from "@/types/profile";
import { useUnreadCounts } from "./useUnreadCounts";
import { showErrorToast } from "@/lib/ui/toast";

export function useMatches(
  userId: string | undefined,
  token: string | undefined,
  search: string
) {
  // fetch matches list via cookie-auth; server infers user from session
  const { data: matches = [], isLoading: loading } = useQuery<Profile[], Error>({
    queryKey: ["matches", /* user inferred by cookie */ "self"],
    queryFn: async (): Promise<Profile[]> => {
      const res = await fetch(`/api/matches`, {
        credentials: "include",
      });
      if (!res.ok) {
        // Best-effort error surface
        try {
          const txt = await res.text();
          if (txt) {
            try {
              const json = JSON.parse(txt);
              const msg =
                (json?.error as string) ||
                (json?.message as string) ||
                `Failed to fetch matches (HTTP ${res.status})`;
              showErrorToast?.(msg);
            } catch {
              showErrorToast?.(txt);
            }
          } else {
            showErrorToast?.(`Failed to fetch matches (HTTP ${res.status})`);
          }
        } catch {
          showErrorToast?.(`Failed to fetch matches (HTTP ${res.status})`);
        }
        return [];
      }
      const data = (await res.json().catch(() => ({}))) as unknown;
      if (data && typeof data === "object" && Array.isArray((data as any).matches)) {
        return (data as { matches: Profile[] }).matches;
      }
      if (Array.isArray(data)) return data as Profile[];
      return [];
    },
    enabled: true,
  });

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
