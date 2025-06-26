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

export function useTypingIndicators({ conversationId, currentUserId, token }: UseTypingIndicatorsProps) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Send typing status to server
  const sendTypingStatus = useCallback(async (action: "start" | "stop") => {
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
    } catch (error) {
      console.error("Error sending typing status:", error);
    }
  }, [conversationId, token]);

  // Fetch current typing users
  const fetchTypingUsers = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/typing-indicators?conversationId=${encodeURIComponent(conversationId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Filter out current user from typing users
        const otherTypingUsers = data.typingUsers?.filter(
          (user: TypingUser) => user.userId !== currentUserId
        ) || [];
        setTypingUsers(otherTypingUsers);
      }
    } catch (error) {
      console.error("Error fetching typing users:", error);
    }
  }, [conversationId, currentUserId, token]);

  // Start typing
  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      sendTypingStatus("start");
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
      sendTypingStatus("stop");
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [isTyping, sendTypingStatus]);

  // Poll for typing users every 2 seconds
  useEffect(() => {
    fetchTypingUsers();
    
    pollIntervalRef.current = setInterval(() => {
      fetchTypingUsers();
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
        sendTypingStatus("stop");
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