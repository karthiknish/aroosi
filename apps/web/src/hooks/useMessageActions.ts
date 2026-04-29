"use client";

import { useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit as fsLimit,
  Timestamp,
} from "firebase/firestore";
import { uploadVoiceMessage } from "@/lib/voiceMessageUtil";
import type { Message, MessageType } from "@aroosi/shared/types";
import {
  sendMessage as sendMessageRequest,
  markConversationRead,
  deleteMessage as deleteMessageRequest,
} from "@/lib/api/messages";

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

        await sendMessageRequest({
          conversationId: normalizedConvId,
          fromUserId: userId,
          toUserId,
          text: trimmed,
          type: "text",
          ...(replyMeta
            ? {
                replyToMessageId: replyMeta.messageId,
                replyToText: replyMeta.text,
                replyToType: replyMeta.type,
                replyToFromUserId: replyMeta.fromUserId,
              }
            : {}),
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to send message";
        console.error("Failed to send message via API", err);
        // Revert optimistic update
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError(message);
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
        });

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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to send voice message";
        console.error("Failed to send voice message", err);
        setError(message);
      }
    },
    [userId, setError, setMessages]
  );

  const sendTypingStart = useCallback(async () => {
    if (!userId || !convKey) return;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      await fetch("/api/typing-indicators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convKey, action: "start" }),
        signal: controller.signal,
      });
      clearTimeout(t);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("sendTypingStart failed", err);
      }
    }
  }, [userId, convKey]);

  const sendTypingStop = useCallback(async () => {
    if (!userId || !convKey) return;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      await fetch("/api/typing-indicators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convKey, action: "stop" }),
        signal: controller.signal,
      });
      clearTimeout(t);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("sendTypingStop failed", err);
      }
    }
  }, [userId, convKey]);

  const markAsRead = useCallback(
    async (messageIds: string[]) => {
      if (!userId || messageIds.length === 0 || !convKey) return;
      try {
        await markConversationRead(convKey);
      } catch (err) {
        console.warn("Failed to mark messages as read", err);
      }
    },
    [userId, convKey]
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
        const d = docSnap.data() as Partial<Message> & { readAt?: number };
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
        await deleteMessageRequest(messageId);
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
