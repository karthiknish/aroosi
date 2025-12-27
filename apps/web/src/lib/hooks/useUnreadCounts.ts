import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { matchesAPI } from "@/lib/api/matches";

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
      try {
        return await matchesAPI.getUnreadCounts();
      } catch {
        return {};
      }
    },
    enabled: true,
    refetchInterval: 10000,
    staleTime: 5000,
  });
}
