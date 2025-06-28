import { useEffect } from "react";
import { useAuthContext } from "@/components/AuthProvider";

// Minimal OneSignal type definition
interface OneSignalSDK {
  getUserId: () => Promise<string | undefined>;
  on: (event: string, callback: (subscribed: boolean) => void) => void;
}

declare global {
  interface Window {
    OneSignal?: OneSignalSDK;
  }
}

/**
 * Registers the current browser with OneSignal and stores the playerId in Convex.
 * Assumes the OneSignal SDK has already been loaded globally via layout.tsx.
 */
export function useOneSignal(): void {
  const { isSignedIn, userId, getToken } = useAuthContext();

  useEffect(() => {
    if (!isSignedIn || !userId) return;

    // wait until SDK available
    if (typeof window === "undefined") return;
    const onReady = () => {
      const OneSignal = window.OneSignal;
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
            } catch (err: unknown) {
              if (err instanceof Error) {
                console.error("push register failed", err.message);
              } else {
                console.error("push register failed", err);
              }
            }
          }
        }
      });
    };

    // defer to next tick to ensure OneSignal script executed
    setTimeout(onReady, 0);
  }, [isSignedIn, userId, getToken]);
}
