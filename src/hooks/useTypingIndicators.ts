"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "@/lib/firebaseClient";
import { collection, doc, onSnapshot, query, setDoc } from "firebase/firestore";

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
  const unsubRef = useRef<(() => void) | null>(null);

  // Send typing status to server
  const sendTypingStatus = useCallback(
    async (action: "start" | "stop") => {
      try {
        const ref = doc(
          db,
          "typingIndicators",
          conversationId,
          "users",
          currentUserId
        );
        await setDoc(
          ref,
          { isTyping: action === "start", updatedAt: Date.now() },
          { merge: true }
        );
      } catch (e) {
        // ignore
      }
    },
    [conversationId, currentUserId]
  );

  // Fetch current typing users
  const fetchTypingUsers = useCallback(() => {}, []); // unused after Firestore subscription

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
  }, [isTyping, sendTypingStatus, stopTyping]);

  // Prefer SSE updates if available; fallback to polling
  useEffect(() => {
    const q = query(
      collection(db, "typingIndicators", conversationId, "users")
    );
    unsubRef.current = onSnapshot(q, (snap) => {
      const list: TypingUser[] = [];
      const now = Date.now();
      snap.forEach((d) => {
        const data: any = d.data();
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
