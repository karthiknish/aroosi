import { useEffect } from "react";
import { useAuthContext } from "@/components/FirebaseAuthProvider";
import { notificationsAPI } from "@/lib/api/notifications";

// Minimal OneSignal type definition supporting v15 and v16
type AnyOS = any;

declare global {
  interface Window {
    OneSignal?: AnyOS;
  }
}

async function getPlayerIdCompat(os: AnyOS): Promise<string | undefined> {
  try {
    // v15 style
    if (os && typeof os.getUserId === "function") {
      const id = await os.getUserId();
      if (id) return id as string;
    }
    // v16 style (sync getter)
    const v16Id = os?.User?.PushSubscription?.id;
    if (typeof v16Id === "string" && v16Id) return v16Id;
    // v16 style (async getter)
    if (typeof os?.User?.PushSubscription?.getId === "function") {
      const id = await os.User.PushSubscription.getId();
      if (id) return id as string;
    }
  } catch {
    // ignore
  }
  return undefined;
}

function onSubscriptionChange(
  os: AnyOS,
  handler: (subscribed: boolean) => void
) {
  // v15 style
  if (os && typeof os.on === "function") {
    os.on("subscriptionChange", handler);
    return;
  }
  // v16 style
  const sub = os?.User?.PushSubscription;
  if (sub && typeof sub.addEventListener === "function") {
    sub.addEventListener("change", (state: { isSubscribed?: boolean }) => {
      handler(Boolean(state?.isSubscribed));
    });
  }
}

/**
 * Registers/unregisters this browser with OneSignal and stores the playerId in Convex.
 * Assumes the OneSignal SDK has already been loaded globally via layout.tsx.
 */
export function useOneSignal(): void {
  const { user, profile, isAuthenticated: isSignedIn } = useAuthContext();
  const userId = user?.uid || (profile as any)?._id || (profile as any)?.userId;

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    if (typeof window === "undefined") return;

    const wire = async () => {
      const os = window.OneSignal as AnyOS | undefined;
      if (!os) return;

      // Handle current state (already subscribed)
      try {
        const id = await getPlayerIdCompat(os);
        if (id) {
          await notificationsAPI.registerPushToken({ playerId: id, deviceType: "web" });
        }
      } catch (err) {
        console.error("push register (initial) failed", err);
      }

      // React to future changes
      onSubscriptionChange(os, async (subscribed) => {
        try {
          const id = await getPlayerIdCompat(os);
          if (subscribed && id) {
            await notificationsAPI.registerPushToken({ playerId: id, deviceType: "web" });
          } else if (!subscribed && id) {
            await notificationsAPI.unregisterPushToken({ playerId: id });
          }
        } catch (err) {
          console.error("push register/unregister failed", err);
        }
      });
    };

    // Defer slightly to allow SDK init script to run
    const t = setTimeout(wire, 0);
    return () => clearTimeout(t);
  }, [isSignedIn, userId]);
}
