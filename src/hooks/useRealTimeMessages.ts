"use client";

import { useState, useEffect, useCallback, useRef } from "react";
// Removed REST message send in favor of direct Firestore writes
// (legacy REST utilities no longer needed here)
import { useAuthContext } from "@/components/UserProfileProvider";
import { uploadVoiceMessage } from "@/lib/voiceMessageUtil";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit as fsLimit,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  Timestamp,
  getDocs,
  writeBatch,
} from "firebase/firestore";

interface UseRealTimeMessagesProps {
  conversationId: string;
  initialMessages?: MessageData[];
}

interface MessageData {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  type: "text" | "voice" | "image";
  audioStorageId?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  isRead?: boolean;
  readAt?: number;
  createdAt: number; // required for compatibility with UI expecting createdAt
  _creationTime: number;
}

interface UseRealTimeMessagesReturn {
  messages: MessageData[];
  isTyping: Record<string, boolean>;
  isConnected: boolean;
  sendMessage: (text: string, toUserId: string) => Promise<void>;
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
}

export function useRealTimeMessages({
  conversationId,
  initialMessages = [],
}: UseRealTimeMessagesProps): UseRealTimeMessagesReturn {
  const { user: userObj } = useAuthContext();
  const userId = userObj?.uid;
  // Core message state (merged text + voice + older pages)
  const [messages, setMessages] = useState<MessageData[]>(
    initialMessages.map((m) => ({
      ...m,
      createdAt: m.createdAt ?? m._creationTime,
      _creationTime: m._creationTime ?? m.createdAt ?? Date.now(),
    }))
  );
  const [windowMessages, setWindowMessages] = useState<MessageData[]>([]); // latest real-time window
  const [olderMessages, setOlderMessages] = useState<MessageData[]>([]); // paged-in older messages
  const [voiceMessages, setVoiceMessages] = useState<MessageData[]>([]); // all voice messages for conversation
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unsubMessagesRef = useRef<(() => void) | null>(null);
  const unsubTypingRef = useRef<(() => void) | null>(null);
  const unsubVoiceRef = useRef<(() => void) | null>(null);

  const PAGE_SIZE = 50;

  // Firestore real-time subscription for messages with retry on transient errors
  useEffect(() => {
    if (!userId || !conversationId) return;
    setIsConnected(false);
    setError(null);
    const msgsRef = collection(db, "messages");
    const q = query(
      msgsRef,
      where("conversationId", "==", conversationId),
      orderBy("createdAt", "desc"),
      fsLimit(PAGE_SIZE)
    );

    let retryCount = 0;
    const maxRetries = 5;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const subscribe = () => {
      // If offline, delay subscription until back online
      if (typeof window !== "undefined" && !navigator.onLine) {
        setError("You are offline. Retrying…");
        retryTimer = setTimeout(subscribe, 1500);
        return;
      }
      unsubMessagesRef.current = onSnapshot(
        q,
        (snap) => {
          retryCount = 0; // reset on success
          setIsConnected(true);
          setError(null);
          const list: MessageData[] = [];
          snap.forEach((docSnap) => {
            const d: any = docSnap.data();
            // Normalize Firestore Timestamp -> number
            const createdAt =
              d.createdAt instanceof Timestamp
                ? d.createdAt.toMillis()
                : d.createdAt || Date.now();
            const readAtNorm =
              d.readAt instanceof Timestamp ? d.readAt.toMillis() : d.readAt;
            list.push({
              _id: d.id || docSnap.id,
              conversationId: d.conversationId,
              fromUserId: d.fromUserId,
              toUserId: d.toUserId,
              text: d.text || "",
              type: d.type || "text",
              audioStorageId: d.audioStorageId,
              duration: d.duration,
              fileSize: d.fileSize,
              mimeType: d.mimeType,
              isRead: !!readAtNorm,
              readAt: readAtNorm,
              createdAt,
              _creationTime: createdAt,
            });
          });
          // list currently descending -> reverse to ascending for UI
          const ascWindow = list.reverse();
          setWindowMessages(ascWindow);
          // Determine if more older messages exist (cheap probe)
          (async () => {
            try {
              if (ascWindow.length === 0) {
                setHasMore(false);
                return;
              }
              const oldest = ascWindow[0].createdAt;
              const probeQ = query(
                msgsRef,
                where("conversationId", "==", conversationId),
                orderBy("createdAt", "asc"),
                where("createdAt", "<", oldest),
                fsLimit(1)
              );
              const probeSnap = await getDocs(probeQ);
              setHasMore(!probeSnap.empty);
            } catch {
              /* ignore */
            }
          })();
        },
        (err) => {
          console.error("Firestore messages subscription error", err);
          // Provide human-friendly error text and suggestions
          const code = (err as any)?.code as string | undefined;
          const msg = (err as any)?.message as string | undefined;
          if (code === "permission-denied") {
            setError("Permission denied. Please sign in again.");
          } else if (
            code === "failed-precondition" &&
            msg &&
            /index/i.test(msg)
          ) {
            setError("Missing Firestore index. An admin must deploy indexes.");
          } else if (typeof window !== "undefined" && !navigator.onLine) {
            setError("You are offline. Retrying…");
          } else {
            setError("Realtime messages failed");
          }
          setIsConnected(false);
          // Retry for transient errors (network, unavailable). Exponential backoff.
          if (retryCount < maxRetries) {
            retryCount += 1;
            const base = 1000 * Math.pow(2, retryCount - 1);
            const jitter = Math.floor(Math.random() * 250);
            const delay = base + jitter;
            console.info(
              "Retrying messages subscription in ms:",
              delay,
              "attempt:",
              retryCount + 1
            );
            retryTimer = setTimeout(() => {
              // unsubscribe previous and resubscribe
              try {
                unsubMessagesRef.current?.();
              } catch {}
              subscribe();
            }, delay);
          }
        }
      );
    };

    subscribe();
    return () => {
      unsubMessagesRef.current?.();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [userId, conversationId]);

  // Voice messages subscription (no pagination yet; typically fewer)
  useEffect(() => {
    if (!userId || !conversationId) return;
    const vRef = collection(db, "voiceMessages");
    const vq = query(
      vRef,
      where("conversationId", "==", conversationId),
      orderBy("createdAt", "asc")
    );
    unsubVoiceRef.current = onSnapshot(
      vq,
      (snap) => {
        const list: MessageData[] = [];
        snap.forEach((docSnap) => {
          const d: any = docSnap.data();
          const createdAt =
            d.createdAt instanceof Timestamp
              ? d.createdAt.toMillis()
              : d.createdAt || Date.now();
          list.push({
            _id: docSnap.id,
            conversationId: d.conversationId,
            fromUserId: d.fromUserId,
            toUserId: d.toUserId,
            text: "",
            type: "voice",
            audioStorageId: d.audioStorageId,
            duration: d.duration,
            fileSize: d.fileSize,
            mimeType: d.mimeType,
            isRead: !!d.readAt,
            readAt: d.readAt,
            createdAt,
            _creationTime: createdAt,
          });
        });
        setVoiceMessages(list);
      },
      (err) => {
        console.error("Voice messages subscription error", err);
      }
    );
    return () => {
      unsubVoiceRef.current?.();
    };
  }, [userId, conversationId]);

  // Merge older + window + voice into messages (ascending by createdAt)
  useEffect(() => {
    const merged = [...olderMessages, ...windowMessages, ...voiceMessages].sort(
      (a, b) => a.createdAt - b.createdAt
    );
    // De-duplicate by _id (voice/text ids distinct collections)
    const seen = new Set<string>();
    const unique: MessageData[] = [];
    for (const m of merged) {
      const key = m._id;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(m);
      }
    }
    setMessages(unique);
  }, [olderMessages, windowMessages, voiceMessages]);

  // Firestore typing indicators (ephemeral docs in collection typingIndicators/{conversationId}/users/{userId})
  useEffect(() => {
    if (!userId || !conversationId) return;
    const typingColl = collection(
      db,
      "typingIndicators",
      conversationId,
      "users"
    );
    const typingQ = query(typingColl);
    unsubTypingRef.current = onSnapshot(
      typingQ,
      (snap) => {
        const map: Record<string, boolean> = {};
        const now = Date.now();
        snap.forEach((docSnap) => {
          const d: any = docSnap.data();
          // expire after 5s
          if (
            d.updatedAt &&
            now - d.updatedAt <= 5000 &&
            docSnap.id !== userId
          ) {
            map[docSnap.id] = !!d.isTyping;
          }
        });
        setIsTyping(map);
      },
      (err) => {
        console.error("Typing indicators subscription error", err);
      }
    );
    return () => {
      unsubTypingRef.current?.();
    };
  }, [userId, conversationId]);

  // (moved above to satisfy dependency order)

  // Send a text message directly via Firestore (bypassing REST API)
  const sendMessage = useCallback(
    async (text: string, toUserId: string) => {
      if (!userId || !text.trim()) return;
      const trimmed = text.trim();
      try {
        const createdAt = Date.now();
        // Optimistic local append (will be replaced by snapshot shortly)
        const tempId = `tmp-${createdAt}`;
        setMessages((prev) => [
          ...prev,
          {
            _id: tempId,
            conversationId,
            fromUserId: userId,
            toUserId,
            text: trimmed,
            type: "text",
            createdAt,
            _creationTime: createdAt,
            isRead: false,
          },
        ]);
        const docRef = await addDoc(collection(db, "messages"), {
          conversationId,
          fromUserId: userId,
          toUserId,
          text: trimmed,
          type: "text",
          createdAt, // numeric for easier client sorting
          createdAtTs: serverTimestamp(), // optional canonical server timestamp
        });
        // Denormalize lastMessage onto match doc
        try {
          const a = [userId, toUserId].sort();
          const a1 = a[0];
          const a2 = a[1];
          const matchesColl = collection(db, "matches");
          let matchDocId: string | null = null;
          // Try user1Id=a1 user2Id=a2 first
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
            // Fallback try reversed (if schema not normalized)
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
                createdAt,
              },
              updatedAt: createdAt,
            });
          }
        } catch {
          // Non-fatal
        }
      } catch (err: any) {
        console.error("Failed to send message via Firestore", err);
        setError(err?.message || "Failed to send message");
        throw err;
      }
    },
    [userId, conversationId]
  );

  // Send voice message
  const sendVoiceMessage = useCallback(
    async (blob: Blob, toUserId: string, duration: number) => {
      if (!userId) return;

      try {
        const saved = await uploadVoiceMessage({
          conversationId,
          toUserId,
          blob,
          duration,
        } as any); // util returns single VoiceMessage

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
            createdAt: saved.createdAt,
            _creationTime: saved.createdAt,
          },
        ]);
        // Denormalize lastMessage for voice
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
          if (!snap1.empty) matchDocId = snap1.docs[0].id;
          else {
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
            await updateDoc(doc(db, "matches", matchDocId), {
              lastMessage: {
                id: saved._id,
                fromUserId: userId,
                toUserId,
                text: "",
                type: "voice",
                createdAt: saved.createdAt,
                duration: saved.duration,
              },
              updatedAt: saved.createdAt,
            });
          }
        } catch {
          /* ignore */
        }
      } catch (err) {
        console.error("Error sending voice message", err);
        if (err instanceof Error) setError(err.message);
        throw err;
      }
    },
    [userId, conversationId]
  );

  // Send typing indicators
  const updateTypingDoc = useCallback(
    async (isTyping: boolean) => {
      if (!userId || !conversationId) return;
      try {
        const ref = doc(
          db,
          "typingIndicators",
          conversationId,
          "users",
          userId
        );
        await setDoc(ref, { isTyping, updatedAt: Date.now() }, { merge: true });
      } catch {
        /* ignore */
      }
    },
    [userId, conversationId]
  );

  const sendTypingStop = useCallback(() => {
    if (!userId) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    void updateTypingDoc(false);
  }, [userId, updateTypingDoc]);

  const sendTypingStart = useCallback(() => {
    if (!userId) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    void updateTypingDoc(true);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop();
    }, 3000);
  }, [userId, sendTypingStop, updateTypingDoc]);

  // Mark messages as read
  const markAsRead = useCallback(
    async (messageIds: string[]) => {
      if (!userId || messageIds.length === 0) return;
      try {
        const batch = writeBatch(db);
        const readAt = Date.now();
        messageIds.forEach((id) => {
          const ref = doc(db, "messages", id);
          batch.update(ref, { readAt });
          // Delivery/read receipt document (idempotent upsert)
          const receiptRef = doc(db, "messageReceipts", `${id}_${userId}`);
          batch.set(
            receiptRef,
            {
              messageId: id,
              userId,
              status: "read",
              updatedAt: readAt,
            },
            { merge: true }
          );
        });
        await batch.commit();
        setMessages((prev) =>
          prev.map((msg) =>
            messageIds.includes(msg._id)
              ? { ...msg, isRead: true, readAt }
              : msg
          )
        );
      } catch (err) {
        console.error("Error marking messages read (Firestore batch)", err);
        setError(
          err instanceof Error ? err.message : "Failed to mark messages as read"
        );
      }
    },
    [userId]
  );

  // Refresh messages from server
  const refreshMessages = useCallback(async () => {
    // Force probe of hasMore again (could be invoked manually)
    try {
      if (windowMessages.length === 0) return;
      const oldest = windowMessages[0].createdAt;
      const msgsRef = collection(db, "messages");
      const probeQ = query(
        msgsRef,
        where("conversationId", "==", conversationId),
        orderBy("createdAt", "asc"),
        where("createdAt", "<", oldest),
        fsLimit(1)
      );
      const probeSnap = await getDocs(probeQ);
      setHasMore(!probeSnap.empty);
    } catch {
      /* ignore */
    }
  }, [conversationId, windowMessages]);

  // Pagination: fetch older chunk
  const fetchOlder = useCallback(async () => {
    if (loadingOlder || !hasMore) return;
    try {
      setLoadingOlder(true);
      const anchor = (olderMessages[0] || windowMessages[0])?.createdAt;
      if (!anchor) {
        setLoadingOlder(false);
        return;
      }
      const msgsRef = collection(db, "messages");
      const olderQ = query(
        msgsRef,
        where("conversationId", "==", conversationId),
        orderBy("createdAt", "asc"),
        where("createdAt", "<", anchor),
        fsLimit(PAGE_SIZE)
      );
      const snap = await getDocs(olderQ);
      const chunk: MessageData[] = [];
      snap.forEach((docSnap) => {
        const d: any = docSnap.data();
        const createdAt =
          d.createdAt instanceof Timestamp
            ? d.createdAt.toMillis()
            : d.createdAt || Date.now();
        const readAtNorm =
          d.readAt instanceof Timestamp ? d.readAt.toMillis() : d.readAt;
        chunk.push({
          _id: docSnap.id,
          conversationId: d.conversationId,
          fromUserId: d.fromUserId,
          toUserId: d.toUserId,
          text: d.text || "",
          type: d.type || "text",
          audioStorageId: d.audioStorageId,
          duration: d.duration,
          fileSize: d.fileSize,
          mimeType: d.mimeType,
          isRead: !!readAtNorm,
          readAt: readAtNorm,
          createdAt,
          _creationTime: createdAt,
        });
      });
      setOlderMessages((prev) => [...chunk, ...prev]);
      setHasMore(chunk.length === PAGE_SIZE);
    } catch (err) {
      console.error("Fetch older messages failed", err);
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, olderMessages, windowMessages, conversationId]);

  // Initialize connection on mount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (unsubMessagesRef.current) {
        unsubMessagesRef.current();
      }
      if (unsubTypingRef.current) {
        unsubTypingRef.current();
      }
      if (unsubVoiceRef.current) {
        unsubVoiceRef.current();
      }
      if (userId) {
        void updateTypingDoc(false);
      }
    };
  }, [userId, updateTypingDoc]);

  // Auto-mark messages as read when they come in
  useEffect(() => {
    if (!userId) return;

    const unreadMessages = messages.filter(
      (msg) => msg.toUserId === userId && !msg.isRead
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
    fetchOlder,
    hasMore,
    loadingOlder,
    error,
  };
}

// (SSE message type guard removed — Firestore onSnapshot now used)
