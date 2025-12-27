"use client";

import { useCallback, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface UseConversationEnsurerProps {
  userId: string | undefined;
  convKey: string;
}

export function useConversationEnsurer({
  userId,
  convKey,
}: UseConversationEnsurerProps) {
  const conversationEnsuredRef = useRef<boolean>(false);

  const ensureConversationExists = useCallback(async () => {
    if (conversationEnsuredRef.current || !userId || !convKey) return;

    const parts = String(convKey).split("_");
    if (parts.length !== 2) return;

    // Verify user is part of the conversation key
    if (!parts.includes(userId)) {
      console.warn("useConversationEnsurer: Current user not in conversation key", {
        userId,
        convKey,
      });
      return;
    }

    const otherId = parts.find((p) => p !== userId);
    if (!otherId) return;

    try {
      const convRef = doc(db, "conversations", convKey);
      await setDoc(
        convRef,
        {
          participants: [userId, otherId].sort(), // Ensure consistent order
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      conversationEnsuredRef.current = true;
      // Wait a bit for the document write to propagate
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err) {
      console.warn("Failed to ensure conversation exists:", err);
    }
  }, [userId, convKey]);

  const ensureConversationReadable = useCallback(async () => {
    if (!userId || !convKey) return false;
    const convRef = doc(db, "conversations", convKey);
    const MAX_ATTEMPTS = 4;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const snap = await getDoc(convRef);
        if (!snap.exists()) {
          await ensureConversationExists();
          await new Promise((resolve) =>
            setTimeout(resolve, 150 * (attempt + 1))
          );
          continue;
        }
        const data: any = snap.data();
        if (
          Array.isArray(data?.participants) &&
          data.participants.includes(userId)
        ) {
          return true;
        }
        // Participants missing or malformed; attempt to repair once
        if (!conversationEnsuredRef.current) {
          await ensureConversationExists();
          continue;
        }
        console.warn("Conversation doc missing membership for current user", {
          convKey,
          participants: data?.participants,
          userId,
        });
        return false;
      } catch (err: any) {
        if (err?.code === "permission-denied") {
          // Allow time for auth propagation and retry
          await new Promise((resolve) =>
            setTimeout(resolve, 250 * (attempt + 1))
          );
          continue;
        }
        console.warn("Conversation readability probe failed", err);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    return false;
  }, [userId, convKey, ensureConversationExists]);

  const resetEnsured = useCallback(() => {
    conversationEnsuredRef.current = false;
  }, []);

  return {
    ensureConversationExists,
    ensureConversationReadable,
    resetEnsured,
    conversationEnsuredRef,
  };
}
