"use client";

import { useState, useEffect, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { handleError } from "@/lib/utils/errorHandling";

interface UseTypingListenerProps {
  userId: string | undefined;
  convKey: string;
  authLoading: boolean;
  authPropagationDelay: number;
  ensureConversationExists: () => Promise<void>;
  ensureConversationReadable: () => Promise<boolean>;
}

export function useTypingListener({
  userId,
  convKey,
  authLoading,
  authPropagationDelay,
  ensureConversationExists,
  ensureConversationReadable,
}: UseTypingListenerProps) {
  const [isTypingMap, setIsTypingMap] = useState<Record<string, boolean>>({});
  const unsubTypingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (authLoading || !userId || !convKey) return;

    const parts = String(convKey).split("_");
    if (parts.length !== 2 || !parts.includes(userId)) return;

    let typingRetryCount = 0;
    let typingRetryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const subscribeTyping = () => {
      if (cancelled) return;

      const typingColl = collection(db, "typingIndicators", convKey, "users");
      const typingQ = query(typingColl);
      unsubTypingRef.current = onSnapshot(
        typingQ,
        (snap) => {
          typingRetryCount = 0;
          const map: Record<string, boolean> = {};
          const now = Date.now();
          snap.forEach((docSnap) => {
            const d: any = docSnap.data();
            if (
              d.updatedAt &&
              now - d.updatedAt <= 5000 &&
              docSnap.id !== userId
            ) {
              map[docSnap.id] = !!d.isTyping;
            }
          });
          setIsTypingMap(map);
        },
        (err) => {
          const code = (err as any)?.code as string | undefined;
          if (
            typingRetryCount >= 5 ||
            (code !== "permission-denied" && code !== "unavailable")
          ) {
            console.error("Typing indicators subscription error", err);
          }
          if (
            typingRetryCount < 5 &&
            (code === "permission-denied" || code === "unavailable")
          ) {
            typingRetryCount += 1;
            const delay =
              1500 * Math.pow(2, Math.min(typingRetryCount - 1, 3)) +
              Math.random() * 500;
            typingRetryTimer = setTimeout(() => {
              try {
                unsubTypingRef.current?.();
              } catch (unsubErr) {
                handleError(
                  unsubErr,
                  { scope: "useTypingListener", action: "unsubscribe_before_retry" },
                  { showToast: false, logError: false }
                );
              }
              subscribeTyping();
            }, delay);
          }
        }
      );
    };

    const initTypingSubscription = async () => {
      try {
        await ensureConversationExists();
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        const readable = await ensureConversationReadable();
        if (!readable) return;
      } catch (e) {
        handleError(e, { scope: "useTypingListener", action: "init_typing_subscription" }, { showToast: false });
      }
      if (!cancelled) {
        subscribeTyping();
      }
    };

    const typingInitialTimer = setTimeout(() => {
      void initTypingSubscription();
    }, authPropagationDelay);

    return () => {
      cancelled = true;
      try {
        unsubTypingRef.current?.();
      } catch (err) {
        handleError(err, { scope: "useTypingListener", action: "unsubscribe_cleanup" }, { showToast: false, logError: false });
      }
      if (typingRetryTimer) clearTimeout(typingRetryTimer);
      clearTimeout(typingInitialTimer);
    };
  }, [
    authLoading,
    userId,
    convKey,
    authPropagationDelay,
    ensureConversationExists,
    ensureConversationReadable,
  ]);

  return { isTypingMap };
}
