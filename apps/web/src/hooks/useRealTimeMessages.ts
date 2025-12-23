"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
// Removed REST message send in favor of direct Firestore writes
// (legacy REST utilities no longer needed here)
import { useAuthContext } from "@/components/UserProfileProvider";
import { uploadVoiceMessage } from "@/lib/voiceMessageUtil";
import { db, auth } from "@/lib/firebase";
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
  getDoc,
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
  replyToMessageId?: string;
  replyToText?: string;
  replyToType?: "text" | "voice" | "image";
  replyToFromUserId?: string;
  deleted?: boolean;
  edited?: boolean;
  editedAt?: number;
}

interface UseRealTimeMessagesReturn {
  messages: MessageData[];
  isTyping: Record<string, boolean>;
  isConnected: boolean;
  sendMessage: (
    text: string,
    toUserId: string,
    replyMeta?: {
      messageId: string;
      text?: string;
      type?: "text" | "voice" | "image";
      fromUserId?: string;
    }
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
  // Normalize conversationId to sorted "userA_userB" if it looks like a two-user chat id
  const convKey = useMemo(() => {
    if (!conversationId) return conversationId as string;
    const parts = String(conversationId).split("_");
    return parts.length === 2 ? parts.slice().sort().join("_") : conversationId;
  }, [conversationId]);
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
  const conversationEnsuredRef = useRef<boolean>(false); // Track if conversation document has been created
  const lastConversationRef = useRef<string | null>(null);
  const authReadyRetryRef = useRef<number>(0); // Track retries for auth propagation
  const initialDelayAppliedRef = useRef<boolean>(false); // Track if we've applied initial auth delay

  const PAGE_SIZE = 50;
  const AUTH_PROPAGATION_DELAY = 500; // ms to wait for auth token to propagate to Firestore after auth is ready

  // Reset conversation-specific refs whenever the conversation changes
  useEffect(() => {
    if (convKey && lastConversationRef.current !== convKey) {
      lastConversationRef.current = convKey;
      conversationEnsuredRef.current = false;
    }
  }, [convKey]);

  // Helper to ensure conversation document exists (required for Firestore rules)
  const ensureConversationExists = useCallback(async () => {
    if (conversationEnsuredRef.current || !userId || !convKey) return;
    
    const parts = String(convKey).split("_");
    if (parts.length !== 2) return;
    
    // Verify user is part of the conversation key
    if (!parts.includes(userId)) {
      console.warn("useRealTimeMessages: Current user not in conversation key", { userId, convKey });
      return;
    }
    
    const otherId = parts.find(p => p !== userId);
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
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      // Non-fatal - the subscription might still work if rules allow ID-based access
      console.warn("Failed to ensure conversation exists:", err);
    }
  }, [userId, convKey]);

  // Probe conversation readability before starting snapshots to avoid permission errors
  const ensureConversationReadable = useCallback(async () => {
    if (!userId || !convKey) return false;
    const convRef = doc(db, "conversations", convKey);
    const MAX_ATTEMPTS = 4;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const snap = await getDoc(convRef);
        if (!snap.exists()) {
          await ensureConversationExists();
          await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
          continue;
        }
        const data: any = snap.data();
        if (Array.isArray(data?.participants) && data.participants.includes(userId)) {
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
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
          continue;
        }
        console.warn("Conversation readability probe failed", err);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    return false;
  }, [userId, convKey, ensureConversationExists]);

  // Firestore real-time subscription for messages with retry on transient errors
  useEffect(() => {
    // Wait for auth to finish loading before subscribing
    if (authLoading || !userId || !convKey) return;
    
    // Validate conversation key format and user membership
    const parts = String(convKey).split("_");
    if (parts.length !== 2 || !parts.includes(userId)) {
      console.warn("Invalid conversation key or user not member:", convKey);
      return;
    }

    setIsConnected(false);
    setError(null);
    const msgsRef = collection(db, "messages");
    const q = query(
      msgsRef,
      where("conversationId", "==", convKey),
      orderBy("createdAt", "desc"),
      fsLimit(PAGE_SIZE)
    );

    let retryCount = 0;
    const maxRetries = 5;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let initialDelayTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const subscribe = () => {
      if (cancelled) return;
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
          authReadyRetryRef.current = 0; // Reset auth propagation retry counter
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
              deleted: !!d.deleted,
              edited: !!d.edited,
              editedAt:
                d.editedAt instanceof Timestamp
                  ? d.editedAt.toMillis()
                  : d.editedAt,
              // Include reply metadata if present (for reply previews & scroll linkage)
              replyToMessageId: d.replyToMessageId,
              replyToText: d.replyToText,
              replyToType: d.replyToType,
              replyToFromUserId: d.replyToFromUserId,
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
                where("conversationId", "==", convKey),
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
          // Provide human-friendly error text and suggestions
          const code = (err as any)?.code as string | undefined;
          const msg = (err as any)?.message as string | undefined;
          
          // Track if this is likely an auth propagation issue (permission-denied on first few attempts)
          const isAuthPropagationIssue = code === "permission-denied" && authReadyRetryRef.current < 5;
          
          // Only log error to console if we're past auth propagation retries
          if (!isAuthPropagationIssue) {
            console.error("Firestore messages subscription error", err);
          }
          
          if (code === "permission-denied") {
            // Don't show error immediately - might be auth propagation delay
            if (authReadyRetryRef.current < 5) {
              setError(null); // Suppress error during auth propagation retries
            } else {
              setError("Permission denied. Please sign in again.");
            }
            // Try to ensure conversation exists on permission error (it's done proactively but may fail)
            if (!conversationEnsuredRef.current) {
              void ensureConversationExists();
            }
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
          
          // Retry for transient errors (network, unavailable) AND permission-denied (auth propagation)
          const shouldRetry = retryCount < maxRetries || isAuthPropagationIssue;
          if (shouldRetry) {
            if (isAuthPropagationIssue) {
              authReadyRetryRef.current += 1;
            }
            retryCount += 1;
            // Use longer delays for permission-denied (auth propagation needs time)
            const base = isAuthPropagationIssue ? 1500 : 1000;
            const multiplier = Math.pow(2, Math.min(retryCount - 1, 3)); // Cap at 8x
            const jitter = Math.floor(Math.random() * 500);
            const delay = base * multiplier + jitter;
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

    // Force token refresh to ensure Firestore has the latest auth state, then subscribe
    const initSubscription = async () => {
      try {
        // Force refresh the ID token to ensure Firestore auth is synchronized
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }
        // Small additional delay to ensure token propagation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Ensure conversation document exists before subscribing
        // This is required for Firestore rules that check conversation membership
        await ensureConversationExists();
        const readable = await ensureConversationReadable();
        if (!readable) {
          setError("Unable to load conversation. Please try again.");
          return;
        }
      } catch {
        // Token refresh failed, but proceed anyway - retry logic will handle permission errors
      }
      if (!cancelled) {
        subscribe();
      }
    };

    // Apply initial delay only once per session, then force token refresh
    if (!initialDelayAppliedRef.current) {
      initialDelayAppliedRef.current = true;
      initialDelayTimer = setTimeout(() => {
        void initSubscription();
      }, AUTH_PROPAGATION_DELAY);
    } else {
      void initSubscription();
    }
    
    return () => {
      cancelled = true;
      unsubMessagesRef.current?.();
      if (retryTimer) clearTimeout(retryTimer);
      if (initialDelayTimer) clearTimeout(initialDelayTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId, convKey, ensureConversationReadable]);

  // Voice messages subscription (no pagination yet; typically fewer)
  useEffect(() => {
    // Wait for auth to finish loading before subscribing
    if (authLoading || !userId || !convKey) return;
    
    // Validate conversation key format and user membership
    const parts = String(convKey).split("_");
    if (parts.length !== 2 || !parts.includes(userId)) return;

    let voiceRetryCount = 0;
    let voiceRetryTimer: ReturnType<typeof setTimeout> | null = null;
    
    const subscribeVoice = () => {
      const vRef = collection(db, "voiceMessages");
      const vq = query(
        vRef,
        where("conversationId", "==", convKey)
        // Note: removed orderBy to avoid composite index requirement
        // Voice messages will be sorted client-side by createdAt
      );
      unsubVoiceRef.current = onSnapshot(
        vq,
        (snap) => {
          voiceRetryCount = 0; // Reset on success
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
          // Sort by createdAt since we removed orderBy from query to avoid composite index
          list.sort((a, b) => a.createdAt - b.createdAt);
          setVoiceMessages(list);
        },
        (err) => {
          const code = (err as any)?.code as string | undefined;
          // Only log error if we're past retry attempts
          if (voiceRetryCount >= 5 || (code !== "permission-denied" && code !== "unavailable")) {
            console.error("Voice messages subscription error", err);
          }
          // Retry on permission-denied (auth propagation) or transient errors
          if (voiceRetryCount < 5 && (code === "permission-denied" || code === "unavailable")) {
            voiceRetryCount += 1;
            const delay = 1500 * Math.pow(2, Math.min(voiceRetryCount - 1, 3)) + Math.random() * 500;
            voiceRetryTimer = setTimeout(() => {
              try { unsubVoiceRef.current?.(); } catch {}
              subscribeVoice();
            }, delay);
          }
        }
      );
    };
    
    let cancelled = false;
    
    // Force token refresh before subscribing to voice messages
    const initVoiceSubscription = async () => {
      try {
        // Ensure conversation document exists before subscribing
        await ensureConversationExists();
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        const readable = await ensureConversationReadable();
        if (!readable) {
          return;
        }
      } catch (e) {
        // Proceed anyway - retry logic will handle errors
      }
      if (!cancelled) {
        subscribeVoice();
      }
    };
    
    // Delay voice subscription to allow auth token propagation
    const voiceInitialTimer = setTimeout(() => {
      void initVoiceSubscription();
    }, AUTH_PROPAGATION_DELAY);
    
    return () => {
      cancelled = true;
      unsubVoiceRef.current?.();
      if (voiceRetryTimer) clearTimeout(voiceRetryTimer);
      clearTimeout(voiceInitialTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId, convKey, ensureConversationReadable]);

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
    // Wait for auth to finish loading before subscribing
    if (authLoading || !userId || !convKey) return;
    
    // Validate conversation key format and user membership
    const parts = String(convKey).split("_");
    if (parts.length !== 2 || !parts.includes(userId)) return;

    let typingRetryCount = 0;
    let typingRetryTimer: ReturnType<typeof setTimeout> | null = null;
    
    const subscribeTyping = () => {
      const typingColl = collection(db, "typingIndicators", convKey, "users");
      const typingQ = query(typingColl);
      unsubTypingRef.current = onSnapshot(
        typingQ,
        (snap) => {
          typingRetryCount = 0; // Reset on success
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
          const code = (err as any)?.code as string | undefined;
          // Only log error if we're past retry attempts
          if (typingRetryCount >= 5 || (code !== "permission-denied" && code !== "unavailable")) {
            console.error("Typing indicators subscription error", err);
          }
          // Retry on permission-denied (auth propagation) or transient errors
          if (typingRetryCount < 5 && (code === "permission-denied" || code === "unavailable")) {
            typingRetryCount += 1;
            const delay = 1500 * Math.pow(2, Math.min(typingRetryCount - 1, 3)) + Math.random() * 500;
            typingRetryTimer = setTimeout(() => {
              try { unsubTypingRef.current?.(); } catch {}
              subscribeTyping();
            }, delay);
          }
        }
      );
    };
    
    let cancelled = false;
    
    // Force token refresh before subscribing to typing indicators
    const initTypingSubscription = async () => {
      try {
        // Ensure conversation document exists before subscribing
        await ensureConversationExists();
        if (auth.currentUser) {
          await auth.currentUser.getIdToken(true);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        const readable = await ensureConversationReadable();
        if (!readable) {
          return;
        }
      } catch (e) {
        // Proceed anyway - retry logic will handle errors
      }
      if (!cancelled) {
        subscribeTyping();
      }
    };
    
    // Delay typing subscription to allow auth token propagation
    const typingInitialTimer = setTimeout(() => {
      void initTypingSubscription();
    }, AUTH_PROPAGATION_DELAY);
    
    return () => {
      cancelled = true;
      unsubTypingRef.current?.();
      if (typingRetryTimer) clearTimeout(typingRetryTimer);
      clearTimeout(typingInitialTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId, convKey, ensureConversationReadable]);

  // (moved above to satisfy dependency order)

  // Send a text message directly via Firestore (bypassing REST API)
  const sendMessage = useCallback(
    async (
      text: string,
      toUserId: string,
      replyMeta?: {
        messageId: string;
        text?: string;
        type?: "text" | "voice" | "image";
        fromUserId?: string;
      }
    ) => {
      if (!userId || !text.trim()) return;
      if (typeof toUserId !== "string" || toUserId.length === 0) {
        setError("Recipient missing");
        return;
      }
      const trimmed = text.trim();
      try {
        const createdAt = Date.now();
        const normalizedConvId = [userId, toUserId].sort().join("_");
        // Optimistic local append (will be replaced by snapshot shortly)
        const tempId = `tmp-${createdAt}`;
        setMessages((prev) => [
          ...prev,
          {
            _id: tempId,
            conversationId: normalizedConvId,
            fromUserId: userId,
            toUserId,
            text: trimmed,
            type: "text",
            createdAt,
            _creationTime: createdAt,
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
        // Ensure conversation doc exists with membership before message write (some rules require membership)
        try {
          const convRef = doc(db, "conversations", normalizedConvId);
          await setDoc(
            convRef,
            {
              participants: [userId, toUserId],
              updatedAt: createdAt,
            },
            { merge: true }
          );
        } catch (e) {
          // Non-fatal: message may still be allowed depending on rules, but try to continue
          // eslint-disable-next-line no-console
          console.warn("Conversation upsert failed (continuing)", e);
        }

        const docRef = await addDoc(collection(db, "messages"), {
          conversationId: normalizedConvId,
          fromUserId: userId,
          toUserId,
          text: trimmed,
          type: "text",
          createdAt,
          ...(replyMeta
            ? {
                replyToMessageId: replyMeta.messageId,
                replyToText: replyMeta.text,
                replyToType: replyMeta.type,
                replyToFromUserId: replyMeta.fromUserId,
              }
            : {}),
        });
        // Upsert conversation membership and lastMessage
        try {
          const convRef = doc(db, "conversations", normalizedConvId);
          await setDoc(
            convRef,
            {
              participants: [userId, toUserId],
              lastMessage: {
                id: docRef.id,
                fromUserId: userId,
                toUserId,
                text: trimmed,
                type: "text",
                createdAt,
              },
              updatedAt: createdAt,
            },
            { merge: true }
          );
        } catch {
          /* non-fatal */
        }
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
      } catch (err: unknown) {
        console.error("Failed to send message via Firestore", err);
        const message =
          err instanceof Error ? err.message : "Failed to send message";
        setError(message);
        throw err as Error;
      }
    },
    [userId]
  );

  // Send voice message
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
        } as any); // util returns single VoiceMessage

        // Optimistically add to state
        setMessages((prev) => [
          ...prev,
          {
            _id: saved._id,
            conversationId: normalizedConvId,
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
        // Upsert conversation membership and lastMessage for voice
        try {
          const convRef = doc(db, "conversations", normalizedConvId);
          await setDoc(
            convRef,
            {
              participants: [userId, toUserId],
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
            },
            { merge: true }
          );
        } catch {
          /* ignore */
        }
        // Denormalize lastMessage for voice to matches
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
    [userId]
  );

  // Send typing indicators
  const updateTypingDoc = useCallback(
    async (isTyping: boolean) => {
      if (!userId || !convKey) return;
      try {
        const ref = doc(db, "typingIndicators", convKey, "users", userId);
        await setDoc(ref, { isTyping, updatedAt: Date.now() }, { merge: true });
      } catch {
        /* ignore */
      }
    },
    [userId, convKey]
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
              conversationId: convKey,
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
    [userId, convKey]
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
        where("conversationId", "==", convKey),
        orderBy("createdAt", "asc"),
        where("createdAt", "<", oldest),
        fsLimit(1)
      );
      const probeSnap = await getDocs(probeQ);
      setHasMore(!probeSnap.empty);
    } catch {
      /* ignore */
    }
  }, [convKey, windowMessages]);

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
        where("conversationId", "==", convKey),
        orderBy("createdAt", "desc"),
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
          // Carry reply metadata for older pages as well
          replyToMessageId: d.replyToMessageId,
          replyToText: d.replyToText,
          replyToType: d.replyToType,
          replyToFromUserId: d.replyToFromUserId,
          deleted: !!d.deleted,
          edited: !!d.edited,
          editedAt:
            d.editedAt instanceof Timestamp
              ? d.editedAt.toMillis()
              : d.editedAt,
        });
      });
      // chunk is descending (newest of the old first), reverse to ascending for olderMessages state
      setOlderMessages((prev) => [...chunk.reverse(), ...prev]);
      setHasMore(chunk.length === PAGE_SIZE);
    } catch (err) {
      console.error("Fetch older messages failed", err);
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, olderMessages, windowMessages, convKey]);
  // Delete message (soft delete via API, optimistic UI)
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      // Optimistic remove or mark as deleted in UI
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      // Server delete (also updates conversation/match lastMessage if needed)
      const { deleteMessage: apiDelete } = await import("@/lib/api/messages");
      await apiDelete(messageId);
    } catch (err) {
      // Rollback: trigger refresh window; easiest is to refetch probe and let onSnapshot repopulate
      setError(err instanceof Error ? err.message : "Failed to delete message");
      // no explicit rollback since snapshot will re-sync shortly
    }
  }, []);

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
    deleteMessage,
  };
}

// (SSE message type guard removed — Firestore onSnapshot now used)
