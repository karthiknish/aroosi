"use client";

import { useState, useEffect, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import type { Message } from "@aroosi/shared/types";

interface UseVoiceSubscriptionProps {
  userId: string | undefined;
  convKey: string;
  authLoading: boolean;
  authPropagationDelay: number;
  ensureConversationExists: () => Promise<void>;
  ensureConversationReadable: () => Promise<boolean>;
}

export function useVoiceSubscription({
  userId,
  convKey,
  authLoading,
  authPropagationDelay,
  ensureConversationExists,
  ensureConversationReadable,
}: UseVoiceSubscriptionProps) {
  const [voiceMessages, setVoiceMessages] = useState<Message[]>([]);
  const unsubVoiceRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (authLoading || !userId || !convKey) return;

    const parts = String(convKey).split("_");
    if (parts.length !== 2 || !parts.includes(userId)) return;

    let voiceRetryCount = 0;
    let voiceRetryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const subscribeVoice = () => {
      if (cancelled) return;

      const vRef = collection(db, "voiceMessages");
      const vq = query(vRef, where("conversationId", "==", convKey));

      unsubVoiceRef.current = onSnapshot(
        vq,
        (snap) => {
          voiceRetryCount = 0;
          const list: Message[] = [];
          snap.forEach((docSnap) => {
            const d: any = docSnap.data();
            const createdAt =
              d.createdAt instanceof Timestamp
                ? d.createdAt.toMillis()
                : d.createdAt || Date.now();
            list.push({
              id: docSnap.id,
              _id: docSnap.id,
              conversationId: d.conversationId,
              fromUserId: d.fromUserId,
              toUserId: d.toUserId,
              text: "",
              type: "voice",
              audioStorageId: d.audioStorageId,
              duration: d.duration,
              fileSize: d.fileSize,
              mimeType: d.mimeType,
              isRead: !!d.readAt,
              readAt: d.readAt,
              createdAt,
              _creationTime: createdAt,
            });
          });
          list.sort(
            (a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0)
          );
          setVoiceMessages(list);
        },
        (err) => {
          const code = (err as any)?.code as string | undefined;
          if (
            voiceRetryCount >= 5 ||
            (code !== "permission-denied" && code !== "unavailable")
          ) {
            console.error("Voice messages subscription error", err);
          }
          if (
            voiceRetryCount < 5 &&
            (code === "permission-denied" || code === "unavailable")
          ) {
            voiceRetryCount += 1;
            const delay =
              1500 * Math.pow(2, Math.min(voiceRetryCount - 1, 3)) +
              Math.random() * 500;
            voiceRetryTimer = setTimeout(() => {
              try {
                unsubVoiceRef.current?.();
              } catch {}
              subscribeVoice();
            }, delay);
          }
        }
      );
    };

    const initVoiceSubscription = async () => {
      try {
        await ensureConversationExists();
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        const readable = await ensureConversationReadable();
        if (!readable) return;
      } catch (e) {
        /* ignore */
      }
      if (!cancelled) {
        subscribeVoice();
      }
    };

    const voiceInitialTimer = setTimeout(() => {
      void initVoiceSubscription();
    }, authPropagationDelay);

    return () => {
      cancelled = true;
      unsubVoiceRef.current?.();
      if (voiceRetryTimer) clearTimeout(voiceRetryTimer);
      clearTimeout(voiceInitialTimer);
    };
  }, [
    authLoading,
    userId,
    convKey,
    authPropagationDelay,
    ensureConversationExists,
    ensureConversationReadable,
  ]);

  return { voiceMessages };
}
