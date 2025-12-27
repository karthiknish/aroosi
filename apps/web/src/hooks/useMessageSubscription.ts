"use client";

import { useState, useEffect, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit as fsLimit,
  Timestamp,
  getDocs,
} from "firebase/firestore";
import type { Message } from "@aroosi/shared/types";

interface UseMessageSubscriptionProps {
  userId: string | undefined;
  convKey: string;
  authLoading: boolean;
  pageSize: number;
  authPropagationDelay: number;
  ensureConversationExists: () => Promise<void>;
  ensureConversationReadable: () => Promise<boolean>;
}

export function useMessageSubscription({
  userId,
  convKey,
  authLoading,
  pageSize,
  authPropagationDelay,
  ensureConversationExists,
  ensureConversationReadable,
}: UseMessageSubscriptionProps) {
  const [windowMessages, setWindowMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const unsubMessagesRef = useRef<(() => void) | null>(null);
  const authReadyRetryRef = useRef<number>(0);
  const initialDelayAppliedRef = useRef<boolean>(false);

  useEffect(() => {
    if (authLoading || !userId || !convKey) return;

    const parts = String(convKey).split("_");
    if (parts.length !== 2 || !parts.includes(userId)) {
      console.warn("Invalid conversation key or user not member:", convKey);
      return;
    }

    setIsConnected(false);
    setError(null);
    const msgsRef = collection(db, "messages");
    const q = query(
      msgsRef,
      where("conversationId", "==", convKey),
      orderBy("createdAt", "desc"),
      fsLimit(pageSize)
    );

    let retryCount = 0;
    const maxRetries = 5;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let initialDelayTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const subscribe = () => {
      if (cancelled) return;
      if (typeof window !== "undefined" && !navigator.onLine) {
        setError("You are offline. Retrying…");
        retryTimer = setTimeout(subscribe, 1500);
        return;
      }

      unsubMessagesRef.current = onSnapshot(
        q,
        (snap) => {
          retryCount = 0;
          authReadyRetryRef.current = 0;
          setIsConnected(true);
          setError(null);
          const list: Message[] = [];
          snap.forEach((docSnap) => {
            const d: any = docSnap.data();
            const createdAt =
              d.createdAt instanceof Timestamp
                ? d.createdAt.toMillis()
                : d.createdAt || Date.now();
            const readAtNorm =
              d.readAt instanceof Timestamp ? d.readAt.toMillis() : d.readAt;

            list.push({
              id: d.id || docSnap.id,
              _id: d.id || docSnap.id,
              conversationId: d.conversationId,
              fromUserId: d.fromUserId,
              toUserId: d.toUserId,
              text: d.text || "",
              type: d.type || "text",
              audioStorageId: d.audioStorageId,
              duration: d.duration,
              fileSize: d.fileSize,
              mimeType: d.mimeType,
              isRead: !!readAtNorm,
              readAt: readAtNorm,
              createdAt,
              _creationTime: createdAt,
              ...(d.deleted && { deleted: true }),
              ...(d.edited && { edited: true }),
              editedAt:
                d.editedAt instanceof Timestamp
                  ? d.editedAt.toMillis()
                  : d.editedAt,
              replyToMessageId: d.replyToMessageId,
              replyToText: d.replyToText,
              replyToType: d.replyToType,
              replyToFromUserId: d.replyToFromUserId,
            });
          });

          const ascWindow = list.reverse();
          setWindowMessages(ascWindow);

          (async () => {
            try {
              if (ascWindow.length === 0) {
                setHasMore(false);
                return;
              }
              const oldest = ascWindow[0].createdAt;
              const probeQ = query(
                msgsRef,
                where("conversationId", "==", convKey),
                orderBy("createdAt", "asc"),
                where("createdAt", "<", oldest),
                fsLimit(1)
              );
              const probeSnap = await getDocs(probeQ);
              setHasMore(!probeSnap.empty);
            } catch {
              /* ignore */
            }
          })();
        },
        (err) => {
          const code = (err as any)?.code as string | undefined;
          const msg = (err as any)?.message as string | undefined;
          const isAuthPropagationIssue =
            code === "permission-denied" && authReadyRetryRef.current < 5;

          if (!isAuthPropagationIssue) {
            console.error("Firestore messages subscription error", err);
          }

          if (code === "permission-denied") {
            if (authReadyRetryRef.current < 5) {
              setError(null);
            } else {
              setError("Permission denied. Please sign in again.");
            }
          } else if (
            code === "failed-precondition" &&
            msg &&
            /index/i.test(msg)
          ) {
            setError("Missing Firestore index. An admin must deploy indexes.");
          } else if (typeof window !== "undefined" && !navigator.onLine) {
            setError("You are offline. Retrying…");
          } else {
            setError("Realtime messages failed");
          }
          setIsConnected(false);

          const shouldRetry = retryCount < maxRetries || isAuthPropagationIssue;
          if (shouldRetry) {
            if (isAuthPropagationIssue) {
              authReadyRetryRef.current += 1;
            }
            retryCount += 1;
            const base = isAuthPropagationIssue ? 1500 : 1000;
            const multiplier = Math.pow(2, Math.min(retryCount - 1, 3));
            const jitter = Math.floor(Math.random() * 500);
            const delay = base * multiplier + jitter;
            retryTimer = setTimeout(() => {
              try {
                unsubMessagesRef.current?.();
              } catch {}
              subscribe();
            }, delay);
          }
        }
      );
    };

    const initSubscription = async () => {
      try {
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        await ensureConversationExists();
        const readable = await ensureConversationReadable();
        if (!readable) {
          setError("Unable to load conversation. Please try again.");
          return;
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) {
        subscribe();
      }
    };

    if (!initialDelayAppliedRef.current) {
      initialDelayAppliedRef.current = true;
      initialDelayTimer = setTimeout(() => {
        void initSubscription();
      }, authPropagationDelay);
    } else {
      void initSubscription();
    }

    return () => {
      cancelled = true;
      unsubMessagesRef.current?.();
      if (retryTimer) clearTimeout(retryTimer);
      if (initialDelayTimer) clearTimeout(initialDelayTimer);
    };
  }, [
    authLoading,
    userId,
    convKey,
    pageSize,
    authPropagationDelay,
    ensureConversationExists,
    ensureConversationReadable,
  ]);

  return {
    windowMessages,
    isConnected,
    error,
    hasMore,
    setHasMore,
    authReadyRetryRef,
  };
}
