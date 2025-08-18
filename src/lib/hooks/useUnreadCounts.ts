import { useQuery } from "@tanstack/react-query";
import { fetchWithFirebaseAuth } from "@/lib/api/fetchWithFirebaseAuth";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export function useUnreadCounts(
  _userId: string | undefined,
  _token: string | undefined
) {
  return useQuery<Record<string, number>>({
    queryKey: ["unreadCounts", "self"],
    queryFn: async () => {
      // Wait briefly for auth user to initialize (avoids early 401 spam)
      if (!auth.currentUser) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 2000);
          const unsub = onAuthStateChanged(auth, () => {
            clearTimeout(timeout);
            unsub();
            resolve();
          });
        });
      }
      let res = await fetchWithFirebaseAuth(`/api/matches/unread`);
      if (res.status === 401 && auth.currentUser) {
        try {
          await auth.currentUser.getIdToken(true); // force refresh
          res = await fetchWithFirebaseAuth(`/api/matches/unread`);
        } catch {}
      }
      if (!res.ok) return {};
      const data = await res.json().catch(() => ({}) as any);
      if (
        data &&
        typeof data === "object" &&
        data.counts &&
        typeof data.counts === "object"
      ) {
        return data.counts as Record<string, number>;
      }
      return {};
    },
    enabled: true,
    refetchInterval: 10000,
    staleTime: 5000,
  });
}
