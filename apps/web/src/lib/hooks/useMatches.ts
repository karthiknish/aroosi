import { useQuery } from "@tanstack/react-query";
import type { Profile } from "@/types/profile";
import { useUnreadCounts } from "./useUnreadCounts";
import { showErrorToast } from "@/lib/ui/toast";
import { fetchWithFirebaseAuth } from "@/lib/api/fetchWithFirebaseAuth";

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
        const res = await fetchWithFirebaseAuth(`/api/matches`);
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
        const json = (await res.json().catch(() => ({}))) as unknown;
        if (json && typeof json === "object") {
          // Handle standard successResponse shape: { success: true, data: [...] }
          if (Array.isArray((json as any).data)) {
            return (json as any).data as Profile[];
          }
          // Fallback legacy: { matches: [...] }
          if (Array.isArray((json as any).matches)) {
            return (json as any).matches as Profile[];
          }
        }
        if (Array.isArray(json)) return json as Profile[];
        return [];
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
