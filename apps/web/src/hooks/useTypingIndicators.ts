"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";

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
  const lastSentRef = useRef<number>(0);
  const unsubRef = useRef<(() => void) | null>(null);

  // Send typing status to server
  const sendTypingStatus = useCallback(
    async (action: "start" | "stop") => {
      try {
        // Update ref immediately for "start" to prevent duplicate calls
        if (action === "start") {
          lastSentRef.current = Date.now();
        }

        // Canonical writer path: server API.
        // This keeps SSE + canonical Firestore typingIndicators in sync.
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 5000);
        await fetch("/api/typing-indicators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, action }),
          signal: controller.signal,
        });
        clearTimeout(t);
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("sendTypingStatus failed", e);
        }
      }
    },
    [conversationId, currentUserId]
  );

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

  // Start typing
  const startTyping = useCallback(() => {
    const now = Date.now();
    
    // If not currently typing, set state and send update
    if (!isTyping) {
      setIsTyping(true);
      void sendTypingStatus("start");
    } else {
      // If already typing, but it's been a while since last update (keep-alive), send update
      // The listener filters out > 5000ms, so we refresh every 3000ms to be safe
      if (now - lastSentRef.current > 3000) {
        void sendTypingStatus("start");
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [isTyping, sendTypingStatus, stopTyping]);

  // Listen for typing updates
  useEffect(() => {
    const q = query(
      collection(db, "typingIndicators", conversationId, "users")
    );
    unsubRef.current = onSnapshot(q, (snap) => {
      const list: TypingUser[] = [];
      const now = Date.now();
      snap.forEach((d) => {
        const data: any = d.data();
        // Filter out self and stale updates (> 5s old)
        if (
          d.id !== currentUserId &&
          data.isTyping &&
          now - data.updatedAt <= 5000
        ) {
          list.push({ userId: d.id, lastUpdated: data.updatedAt });
        }
      });
      setTypingUsers(list);
    });
    return () => {
      unsubRef.current?.();
    };
  }, [conversationId, currentUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      unsubRef.current?.();
    };
  }, []);

  return {
    typingUsers,
    isTyping,
    startTyping,
    stopTyping,
  };
}
