"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "@/components/AuthProvider";
import { MessageData, MessageEvent } from "@/lib/utils/messageUtils";
import { uploadVoiceMessage } from "@/lib/voiceMessageUtil";

interface UseRealTimeMessagesProps {
  conversationId: string;
  initialMessages?: MessageData[];
}

interface UseRealTimeMessagesReturn {
  messages: MessageData[];
  isTyping: Record<string, boolean>;
  isConnected: boolean;
  sendMessage: (text: string, toUserId: string) => Promise<void>;
  sendVoiceMessage: (
    blob: Blob,
    toUserId: string,
    duration: number,
  ) => Promise<void>;
  sendTypingStart: () => void;
  sendTypingStop: () => void;
  markAsRead: (messageIds: string[]) => Promise<void>;
  refreshMessages: () => Promise<void>;
  error: string | null;
}

export function useRealTimeMessages({
  conversationId,
  initialMessages = [],
}: UseRealTimeMessagesProps): UseRealTimeMessagesReturn {
  const { userId } = useAuthContext();
  const [messages, setMessages] = useState<MessageData[]>(initialMessages);
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle real-time events (moved above to satisfy dependency order for effects)
  const handleRealTimeEvent = useCallback(
    (event: MessageEvent) => {
      switch (event.type) {
        case "message_sent":
          if (event.data && event.conversationId === conversationId) {
            setMessages((prev) => {
              const exists = prev.some(
                (msg) => msg._id === (event.data as MessageData)._id,
              );
              if (exists) return prev;
              return [...prev, event.data as MessageData];
            });
          }
          break;
        case "message_read":
          if (event.data && event.conversationId === conversationId) {
            setMessages((prev) =>
              prev.map((msg) =>
                (event.data as { messageIds: string[] }).messageIds.includes(
                  msg._id,
                )
                  ? { ...msg, isRead: true, readAt: event.timestamp }
                  : msg,
              ),
            );
          }
          break;
        case "typing_start":
          if (event.userId !== userId && event.conversationId === conversationId) {
            setIsTyping((prev) => ({ ...prev, [event.userId]: true }));
          }
          break;
        case "typing_stop":
          if (event.userId !== userId && event.conversationId === conversationId) {
            setIsTyping((prev) => ({ ...prev, [event.userId]: false }));
          }
          break;
      }
    },
    [conversationId, userId],
  );

  // Initialize EventSource connection for real-time updates
  const initializeConnection = useCallback(async () => {
    if (!userId || !conversationId) return;

    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new EventSource connection (cookie-based auth; server reads session cookies)
      const eventSource = new EventSource(
        `/api/messages/events?conversationId=${conversationId}`,
      );

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const messageEvent: unknown = JSON.parse(event.data);
          if (isMessageEvent(messageEvent)) {
            handleRealTimeEvent(messageEvent);
          } else {
            console.error(
              "Received malformed real-time message:",
              messageEvent,
            );
          }
        } catch (err: unknown) {
          if (err instanceof Error) {
            console.error("Error parsing real-time message:", err.message);
          } else {
            console.error("Error parsing real-time message:", err);
          }
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        setError("Connection lost. Attempting to reconnect...");

        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          void initializeConnection();
        }, 3000);
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error("Error initializing real-time connection:", err);
      setError("Failed to establish real-time connection");
    }
  }, [userId, conversationId, handleRealTimeEvent]);

  // (moved above to satisfy dependency order)

  // Send a text message
  const sendMessage = useCallback(
    async (text: string, toUserId: string) => {
      if (!userId || !text.trim()) return;

      try {
        const response = await fetch("/api/match-messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId,
            toUserId,
            text: text.trim(),
          }),
        });

        if (!response.ok) {
          let errorData: unknown;
          try {
            errorData = await response.json();
          } catch {
            errorData = {};
          }
          if (
            typeof errorData === "object" &&
            errorData !== null &&
            "error" in errorData &&
            typeof (errorData as { error?: unknown }).error === "string"
          ) {
            throw new Error((errorData as { error: string }).error);
          }
          throw new Error("Failed to send message");
        }

        const result: unknown = await response.json();

        if (
          typeof result === "object" &&
          result !== null &&
          "data" in result &&
          typeof (result as { data: unknown }).data === "object" &&
          result.data !== null &&
          "_id" in (result as { data: { _id?: unknown } }).data &&
          typeof (result as { data: { _id?: unknown } }).data._id === "string"
        ) {
          // Optimistically add message to local state
          const newMessage: MessageData = {
            _id: (result as { data: { _id: string } }).data._id,
            conversationId,
            fromUserId: userId,
            toUserId,
            text: text.trim(),
            type: "text",
            isRead: false,
            _creationTime: Date.now(),
          };
          setMessages((prev) => [...prev, newMessage]);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error("Error sending message:", err.message);
          setError(err.message);
        } else {
          console.error("Error sending message:", err);
          setError("Failed to send message");
        }
        throw err;
      }
    },
    [userId, conversationId],
  );

  // Send voice message
  const sendVoiceMessage = useCallback(
    async (blob: Blob, toUserId: string, duration: number) => {
      if (!userId) return;

      try {
        const saved = await uploadVoiceMessage({
          conversationId,
          fromUserId: userId,
          toUserId,
          blob,
          duration,
        });

        // Optimistically add to state
        setMessages((prev) => [
          ...prev,
          {
            _id: saved._id,
            conversationId,
            fromUserId: userId,
            toUserId,
            text: "",
            type: "voice",
            audioStorageId: saved.audioStorageId,
            duration: saved.duration,
            fileSize: saved.fileSize,
            mimeType: saved.mimeType,
            isRead: false,
            _creationTime: saved.createdAt,
          },
        ]);
      } catch (err) {
        console.error("Error sending voice message", err);
        if (err instanceof Error) setError(err.message);
        throw err;
      }
    },
    [userId, conversationId],
  );

  // Send typing indicators
  const sendTypingStop = useCallback(() => {
    if (!userId || !eventSourceRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Broadcast typing stop
    // const event = createMessageEvent('typing_stop', conversationId, userId);
  }, [userId]);

  const sendTypingStart = useCallback(() => {
    if (!userId || !eventSourceRef.current) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Broadcast typing start (implementation would depend on your WebSocket/SSE setup)
    // const event = createMessageEvent('typing_start', conversationId, userId);

    // Set timeout to automatically stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop();
    }, 3000);
  }, [userId, sendTypingStop]);

  // Mark messages as read
  const markAsRead = useCallback(
    async (messageIds: string[]) => {
      if (!userId || messageIds.length === 0) return;

      try {
        const response = await fetch("/api/messages/mark-read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messageIds }),
        });

        if (!response.ok) {
          let errorData: unknown;
          try {
            errorData = await response.json();
          } catch {
            errorData = {};
          }
          if (
            typeof errorData === "object" &&
            errorData !== null &&
            "error" in errorData &&
            typeof (errorData as { error?: unknown }).error === "string"
          ) {
            throw new Error((errorData as { error: string }).error);
          }
          throw new Error("Failed to mark messages as read");
        }

        // Optimistically update local state
        setMessages((prev) =>
          prev.map((msg) =>
            messageIds.includes(msg._id)
              ? { ...msg, isRead: true, readAt: Date.now() }
              : msg,
          ),
        );
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error("Error marking messages as read:", err.message);
          setError(err.message);
        } else {
          console.error("Error marking messages as read:", err);
          setError("Failed to mark messages as read");
        }
      }
    },
    [userId],
  );

  // Refresh messages from server
  const refreshMessages = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(
        `/api/match-messages?conversationId=${conversationId}&limit=50`,
        {
          // Cookie-only auth: no Authorization header; server uses cookies
        },
      );

      if (!response.ok) {
        let errorData: unknown;
        try {
          errorData = await response.json();
        } catch {
          errorData = {};
        }
        if (
          typeof errorData === "object" &&
          errorData !== null &&
          "error" in errorData &&
          typeof (errorData as { error?: unknown }).error === "string"
        ) {
          throw new Error((errorData as { error: string }).error);
        }
        throw new Error("Failed to fetch messages");
      }

      const result: unknown = await response.json();
      if (
        typeof result === "object" &&
        result !== null &&
        "data" in result &&
        typeof (result as { data: unknown }).data === "object" &&
        result.data !== null &&
        "messages" in (result as { data: { messages?: unknown } }).data &&
        Array.isArray(
          (result as { data: { messages?: unknown } }).data.messages,
        )
      ) {
        setMessages(
          (result as { data: { messages: MessageData[] } }).data.messages || [],
        );
      }
      // else: do not update if response is malformed
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error refreshing messages:", err.message);
        setError(err.message);
      } else {
        console.error("Error refreshing messages:", err);
        setError("Failed to refresh messages");
      }
    }
  }, [userId, conversationId]);

  // Initialize connection on mount
  useEffect(() => {
    void initializeConnection();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [initializeConnection]);

  // Auto-mark messages as read when they come in
  useEffect(() => {
    if (!userId) return;

    const unreadMessages = messages.filter(
      (msg) => msg.toUserId === userId && !msg.isRead,
    );

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((msg) => msg._id);
      void markAsRead(messageIds);
    }
  }, [messages, userId, markAsRead]);

  return {
    messages,
    isTyping,
    isConnected,
    sendMessage,
    sendVoiceMessage,
    sendTypingStart,
    sendTypingStop,
    markAsRead,
    refreshMessages,
    error,
  };
}

// Type guard for MessageEvent
function isMessageEvent(event: unknown): event is MessageEvent {
  return (
    typeof event === "object" &&
    event !== null &&
    "type" in event &&
    typeof (event as { type: unknown }).type === "string" &&
    "conversationId" in event &&
    typeof (event as { conversationId: unknown }).conversationId === "string"
  );
}
