"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface TypingUser {
  userId: string;
  lastUpdated: number;
}

interface UseTypingIndicatorsProps {
  conversationId: string;
  currentUserId: string;
  token: string;
}

export function useTypingIndicators({
  conversationId,
  currentUserId,
  token,
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

  // Send typing status to server
  const sendTypingStatus = useCallback(
    async (action: "start" | "stop") => {
      try {
        await fetch("/api/typing-indicators", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
    [conversationId, token],
  );

  // Fetch current typing users
  const fetchTypingUsers = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/typing-indicators?conversationId=${encodeURIComponent(conversationId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
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
            (user: TypingUser) => user.userId !== currentUserId,
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
  }, [conversationId, currentUserId, token]);

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

  // Poll for typing users every 2 seconds
  useEffect(() => {
    void fetchTypingUsers();

    pollIntervalRef.current = setInterval(() => {
      void fetchTypingUsers();
    }, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchTypingUsers]);

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
