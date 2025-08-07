"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface TypingUser {
  userId: string;
  lastUpdated: number;
}

interface UseTypingIndicatorsProps {
  conversationId: string;
  currentUserId: string;
}

export function useTypingIndicators({
  conversationId,
  currentUserId,
}: UseTypingIndicatorsProps): {
  typingUsers: TypingUser[];
  isTyping: boolean;
  startTyping: () => void;
  stopTyping: () => void;
} {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Send typing status to server
  const sendTypingStatus = useCallback(
    async (action: "start" | "stop") => {
      try {
        await fetch("/api/typing-indicators", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Cookie-based session; no Authorization header
          },
          body: JSON.stringify({
            conversationId,
            action,
          }),
        });
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Error sending typing status:", error.message);
        } else {
          console.error("Error sending typing status:", error);
        }
      }
    },
    [conversationId]
  );

  // Fetch current typing users
  const fetchTypingUsers = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/typing-indicators?conversationId=${encodeURIComponent(conversationId)}`,
        {
          headers: {
            // Cookie-based session; no Authorization header
          },
        }
      );

      if (response.ok) {
        const data: unknown = await response.json();
        let otherTypingUsers: TypingUser[] = [];
        if (
          typeof data === "object" &&
          data !== null &&
          "typingUsers" in data &&
          Array.isArray((data as { typingUsers: unknown }).typingUsers)
        ) {
          otherTypingUsers = (
            data as { typingUsers: TypingUser[] }
          ).typingUsers.filter(
            (user: TypingUser) => user.userId !== currentUserId
          );
        }
        setTypingUsers(otherTypingUsers);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching typing users:", error.message);
      } else {
        console.error("Error fetching typing users:", error);
      }
    }
  }, [conversationId, currentUserId]);

  // Start typing
  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      void sendTypingStatus("start");
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [isTyping, sendTypingStatus]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (isTyping) {
      setIsTyping(false);
      void sendTypingStatus("stop");
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [isTyping, sendTypingStatus]);

  // Prefer SSE updates if available; fallback to polling
  useEffect(() => {
    // Try SSE from conversation events endpoint
    try {
      const es = new EventSource(`/api/conversations/${encodeURIComponent(conversationId)}/events`);
      sseRef.current = es;
      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (
            data?.conversationId === conversationId &&
            (data?.type === "typing_start" || data?.type === "typing_stop")
          ) {
            setTypingUsers((prev) => {
              const arr = Array.isArray(prev) ? prev : [];
              if (data.type === "typing_start") {
                const exists = arr.some((u) => u.userId === data.userId);
                return exists
                  ? arr
                  : [...arr, { userId: data.userId as string, lastUpdated: Date.now() }];
              } else {
                return arr.filter((u) => u.userId !== data.userId);
              }
            });
          }
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        // Fallback to polling if SSE fails
        es.close();
        sseRef.current = null;
        void fetchTypingUsers();
        pollIntervalRef.current = setInterval(() => void fetchTypingUsers(), 2000);
      };
      return () => {
        if (sseRef.current) sseRef.current.close();
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    } catch {
      // If EventSource not available, use polling
      void fetchTypingUsers();
      pollIntervalRef.current = setInterval(() => void fetchTypingUsers(), 2000);
      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [conversationId, fetchTypingUsers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (isTyping) {
        void sendTypingStatus("stop");
      }
    };
  }, [isTyping, sendTypingStatus]);

  return {
    typingUsers,
    isTyping,
    startTyping,
    stopTyping,
  };
}
