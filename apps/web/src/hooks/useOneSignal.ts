import { useEffect } from "react";
import { useAuthContext } from "@/components/AuthProvider";

/**
 * Registers the current browser with OneSignal and stores the playerId in Convex.
 * Assumes the OneSignal SDK has already been loaded globally via layout.tsx.
 */
export function useOneSignal() {
  const { isSignedIn, userId, getToken } = useAuthContext();

  useEffect(() => {
    if (!isSignedIn || !userId) return;

    // wait until SDK available
    if (typeof window === "undefined") return;
    const onReady = () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const OneSignal = window.OneSignal || undefined;
      if (!OneSignal || !OneSignal.getUserId) return;

      OneSignal.on("subscriptionChange", async (subscribed: boolean) => {
        if (subscribed) {
          const playerId = await OneSignal.getUserId();
          if (playerId) {
            try {
              const token = await getToken();
              await fetch("/api/push/register", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: token ? `Bearer ${token}` : "",
                },
                body: JSON.stringify({ playerId }),
              });
            } catch (err) {
              console.error("push register failed", err);
            }
          }
        }
      });
    };

    // defer to next tick to ensure OneSignal script executed
    setTimeout(onReady, 0);
  }, [isSignedIn, userId, getToken]);
}
