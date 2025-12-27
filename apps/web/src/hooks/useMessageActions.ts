"use client";

import { useCallback, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as fsLimit,
  writeBatch,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { uploadVoiceMessage } from "@/lib/voiceMessageUtil";
import type { Message, MessageType } from "@aroosi/shared/types";

interface UseMessageActionsProps {
  userId: string | undefined;
  convKey: string;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  olderMessages: Message[];
  setOlderMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  windowMessages: Message[];
  setHasMore: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadingOlder: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  pageSize: number;
}

export function useMessageActions({
  userId,
  convKey,
  setMessages,
  olderMessages,
  setOlderMessages,
  windowMessages,
  setHasMore,
  setLoadingOlder,
  setError,
  pageSize,
}: UseMessageActionsProps) {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendMessage = useCallback(
    async (
      text: string,
      toUserId: string,
      replyMeta?: {
        messageId: string;
        text?: string;
        type?: MessageType;
        fromUserId?: string;
      },
      customTempId?: string
    ) => {
      if (!userId || !text.trim()) return;
      if (typeof toUserId !== "string" || toUserId.length === 0) {
        setError("Recipient missing");
        return;
      }
      const trimmed = text.trim();
      const createdAtTime = Date.now();
      const normalizedConvId = [userId, toUserId].sort().join("_");
      const tempId = customTempId || `tmp-${createdAtTime}`;

      try {
        // Optimistic local append
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            _id: tempId,
            conversationId: normalizedConvId,
            fromUserId: userId,
            toUserId,
            text: trimmed,
            type: "text",
            createdAt: createdAtTime,
            _creationTime: createdAtTime,
            isRead: false,
            ...(replyMeta
              ? {
                  replyToMessageId: replyMeta.messageId,
                  replyToText: replyMeta.text,
                  replyToType: replyMeta.type,
                  replyToFromUserId: replyMeta.fromUserId,
                }
              : {}),
          },
        ]);

        try {
          const convRef = doc(db, "conversations", normalizedConvId);
          await setDoc(
            convRef,
            {
              participants: [userId, toUserId],
              updatedAt: createdAtTime,
            },
            { merge: true }
          );
        } catch (e) {
          console.warn("Conversation upsert failed (continuing)", e);
        }

        const docRef = await addDoc(collection(db, "messages"), {
          conversationId: normalizedConvId,
          fromUserId: userId,
          toUserId,
          text: trimmed,
          type: "text",
          createdAt: createdAtTime,
          ...(replyMeta
            ? {
                replyToMessageId: replyMeta.messageId,
                replyToText: replyMeta.text,
                replyToType: replyMeta.type,
                replyToFromUserId: replyMeta.fromUserId,
              }
            : {}),
        });

        try {
          const convRef = doc(db, "conversations", normalizedConvId);
          await setDoc(
            convRef,
            {
              participants: [userId, toUserId],
              lastMessage: {
                id: docRef.id,
                fromUserId: userId,
                toUserId,
                text: trimmed,
                type: "text",
                createdAt: createdAtTime,
              },
              updatedAt: createdAtTime,
            },
            { merge: true }
          );
        } catch {
          /* non-fatal */
        }

        try {
          const a = [userId, toUserId].sort();
          const a1 = a[0];
          const a2 = a[1];
          const matchesColl = collection(db, "matches");
          let matchDocId: string | null = null;
          const q1 = query(
            matchesColl,
            where("user1Id", "==", a1),
            where("user2Id", "==", a2),
            where("status", "==", "matched"),
            fsLimit(1)
          );
          const snap1 = await getDocs(q1);
          if (!snap1.empty) {
            matchDocId = snap1.docs[0].id;
          } else {
            const q2 = query(
              matchesColl,
              where("user1Id", "==", a2),
              where("user2Id", "==", a1),
              where("status", "==", "matched"),
              fsLimit(1)
            );
            const snap2 = await getDocs(q2);
            if (!snap2.empty) matchDocId = snap2.docs[0].id;
          }
          if (matchDocId) {
            const matchRef = doc(db, "matches", matchDocId);
            await updateDoc(matchRef, {
              lastMessage: {
                id: docRef.id,
                fromUserId: userId,
                toUserId,
                text: trimmed,
                type: "text",
                createdAt: createdAtTime,
              },
              updatedAt: createdAtTime,
            });
          }
        } catch {
          /* ignore */
        }
      } catch (err: any) {
        console.error("Failed to send message via Firestore", err);
        // Revert optimistic update
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError(err.message || "Failed to send message");
        throw err;
      }
    },
    [userId, setError, setMessages]
  );

  const sendVoiceMessage = useCallback(
    async (blob: Blob, toUserId: string, duration: number) => {
      if (!userId) return;

      try {
        const normalizedConvId = [userId, toUserId].sort().join("_");
        const saved = await uploadVoiceMessage({
          conversationId: normalizedConvId,
          toUserId,
          blob,
          duration,
        } as any);

        setMessages((prev) => [
          ...prev,
          {
            id: saved._id,
            _id: saved._id,
            conversationId: normalizedConvId,
            fromUserId: userId,
            toUserId,
            text: "",
            type: "voice",
            audioStorageId: saved.audioStorageId,
            duration,
            createdAt: Date.now(),
            _creationTime: Date.now(),
          },
        ]);
      } catch (err: any) {
        console.error("Failed to send voice message", err);
        setError(err.message || "Failed to send voice message");
      }
    },
    [userId, setError, setMessages]
  );

  const sendTypingStart = useCallback(async () => {
    if (!userId || !convKey) return;
    try {
      const ref = doc(db, "typingIndicators", convKey, "users", userId);
      await setDoc(ref, { isTyping: true, updatedAt: Date.now() }, { merge: true });
    } catch {
      /* ignore */
    }
  }, [userId, convKey]);

  const sendTypingStop = useCallback(async () => {
    if (!userId || !convKey) return;
    try {
      const ref = doc(db, "typingIndicators", convKey, "users", userId);
      await setDoc(ref, { isTyping: false, updatedAt: Date.now() }, { merge: true });
    } catch {
      /* ignore */
    }
  }, [userId, convKey]);

  const markAsRead = useCallback(
    async (messageIds: string[]) => {
      if (!userId || messageIds.length === 0) return;
      try {
        const batch = writeBatch(db);
        const now = Date.now();
        messageIds.forEach((id) => {
          const ref = doc(db, "messages", id);
          batch.update(ref, { readAt: now });
        });
        await batch.commit();
      } catch (err) {
        console.warn("Failed to mark messages as read", err);
      }
    },
    [userId]
  );

  const fetchOlder = useCallback(async () => {
    if (!convKey || setLoadingOlder === undefined) return;
    setLoadingOlder(true);
    try {
      const oldestTimestamp =
        olderMessages.length > 0
          ? olderMessages[0].createdAt
          : windowMessages.length > 0
          ? windowMessages[0].createdAt
          : Date.now();

      const msgsRef = collection(db, "messages");
      const q = query(
        msgsRef,
        where("conversationId", "==", convKey),
        orderBy("createdAt", "desc"),
        where("createdAt", "<", oldestTimestamp),
        fsLimit(pageSize)
      );

      const snap = await getDocs(q);
      const fetched: Message[] = [];
      snap.forEach((docSnap) => {
        const d: any = docSnap.data();
        const createdAt =
          d.createdAt instanceof Timestamp
            ? d.createdAt.toMillis()
            : d.createdAt || Date.now();
        fetched.push({
          id: d.id || docSnap.id,
          _id: d.id || docSnap.id,
          conversationId: d.conversationId,
          fromUserId: d.fromUserId,
          toUserId: d.toUserId,
          text: d.text || "",
          type: d.type || "text",
          createdAt,
          _creationTime: createdAt,
          isRead: !!d.readAt,
        } as Message);
      });

      const sorted = fetched.sort(
        (a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0)
      );
      setOlderMessages((prev) => [...sorted, ...prev]);
      setHasMore(snap.docs.length === pageSize);
    } catch (err) {
      console.error("Failed to fetch older messages", err);
    } finally {
      setLoadingOlder(false);
    }
  }, [convKey, olderMessages, windowMessages, pageSize, setOlderMessages, setHasMore, setLoadingOlder]);

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!userId) return;
      try {
        const ref = doc(db, "messages", messageId);
        await updateDoc(ref, { deleted: true, text: "[Message deleted]" });
      } catch (err) {
        console.error("Failed to delete message", err);
      }
    },
    [userId]
  );

  return {
    sendMessage,
    sendVoiceMessage,
    sendTypingStart,
    sendTypingStop,
    markAsRead,
    fetchOlder,
    deleteMessage,
  };
}
