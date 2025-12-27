"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuthContext } from "@/components/UserProfileProvider";
import type { Message, MessageType } from "@aroosi/shared/types";
import { useConversationEnsurer } from "./useConversationEnsurer";
import { useMessageSubscription } from "./useMessageSubscription";
import { useVoiceSubscription } from "./useVoiceSubscription";
import { useTypingListener } from "./useTypingListener";
import { useMessageActions } from "./useMessageActions";

interface UseRealTimeMessagesProps {
  conversationId: string;
  initialMessages?: Message[];
}

interface UseRealTimeMessagesReturn {
  messages: Message[];
  isTyping: Record<string, boolean>;
  isConnected: boolean;
  sendMessage: (
    text: string,
    toUserId: string,
    replyMeta?: {
      messageId: string;
      text?: string;
      type?: MessageType;
      fromUserId?: string;
    },
    customTempId?: string
  ) => Promise<void>;
  sendVoiceMessage: (
    blob: Blob,
    toUserId: string,
    duration: number
  ) => Promise<void>;
  sendTypingStart: () => void;
  sendTypingStop: () => void;
  markAsRead: (messageIds: string[]) => Promise<void>;
  refreshMessages: () => Promise<void>;
  fetchOlder: () => Promise<void>;
  hasMore: boolean;
  loadingOlder: boolean;
  error: string | null;
  deleteMessage: (messageId: string) => Promise<void>;
}

export function useRealTimeMessages({
  conversationId,
  initialMessages = [],
}: UseRealTimeMessagesProps): UseRealTimeMessagesReturn {
  const { user: userObj, isLoading: authLoading } = useAuthContext();
  const userId = userObj?.uid;

  const PAGE_SIZE = 50;
  const AUTH_PROPAGATION_DELAY = 500;

  // Normalize conversationId
  const convKey = useMemo(() => {
    if (!conversationId) return conversationId as string;
    const parts = String(conversationId).split("_");
    return parts.length === 2 ? parts.slice().sort().join("_") : conversationId;
  }, [conversationId]);

  // Core state
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.map((m) => ({
      ...m,
      createdAt: m.createdAt ?? m._creationTime ?? Date.now(),
      _creationTime: m._creationTime ?? (typeof m.createdAt === 'number' ? m.createdAt : Date.now()),
    }))
  );
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Sub-hooks
  const {
    ensureConversationExists,
    ensureConversationReadable,
    resetEnsured
  } = useConversationEnsurer({ userId, convKey });

  const {
    windowMessages,
    isConnected,
    error: subscriptionError,
    hasMore,
    setHasMore
  } = useMessageSubscription({
    userId,
    convKey,
    authLoading,
    pageSize: PAGE_SIZE,
    authPropagationDelay: AUTH_PROPAGATION_DELAY,
    ensureConversationExists,
    ensureConversationReadable
  });

  const { voiceMessages } = useVoiceSubscription({
    userId,
    convKey,
    authLoading,
    authPropagationDelay: AUTH_PROPAGATION_DELAY,
    ensureConversationExists,
    ensureConversationReadable
  });

  const { isTypingMap } = useTypingListener({
    userId,
    convKey,
    authLoading,
    authPropagationDelay: AUTH_PROPAGATION_DELAY,
    ensureConversationExists,
    ensureConversationReadable
  });

  const {
    sendMessage,
    sendVoiceMessage,
    sendTypingStart,
    sendTypingStop,
    markAsRead,
    fetchOlder,
    deleteMessage
  } = useMessageActions({
    userId,
    convKey,
    setMessages: setOptimisticMessages, // We'll use this to manage optimistic messages
    olderMessages,
    setOlderMessages,
    windowMessages,
    setHasMore,
    setLoadingOlder,
    setError: setInternalError,
    pageSize: PAGE_SIZE
  });

  // Reset ensured flag when conversation changes
  useEffect(() => {
    resetEnsured();
    setOptimisticMessages([]);
  }, [convKey, resetEnsured]);

  // Merge older + window + voice + optimistic into messages (ascending by createdAt)
  useEffect(() => {
    // Filter out optimistic messages that have been "confirmed" by appearing in windowMessages
    const filteredOptimistic = optimisticMessages.filter(opt => {
      return !windowMessages.some(win => 
        win.fromUserId === opt.fromUserId && 
        win.text === opt.text && 
        Math.abs((Number(win.createdAt) || 0) - (Number(opt.createdAt) || 0)) < 5000
      );
    });

    const merged = [...olderMessages, ...windowMessages, ...voiceMessages, ...filteredOptimistic].sort(
      (a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0)
    );
    // De-duplicate by _id
    const seen = new Set<string>();
    const unique: Message[] = [];
    for (const m of merged) {
      const key = m.id || m._id || "unknown";
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(m);
      }
    }
    setMessages(unique);
  }, [olderMessages, windowMessages, voiceMessages, optimisticMessages]);

  const refreshMessages = useCallback(async () => {
    setOlderMessages([]);
  }, []);

  return {
    messages,
    isTyping: isTypingMap,
    isConnected,
    sendMessage,
    sendVoiceMessage,
    sendTypingStart,
    sendTypingStop,
    markAsRead,
    refreshMessages,
    fetchOlder,
    hasMore,
    loadingOlder,
    error: subscriptionError || internalError,
    deleteMessage,
  };
}
