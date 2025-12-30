import { useState, useCallback, useEffect, useRef } from "react";
import { matchMessagesAPI, type MatchMessage } from "@/lib/api/matchMessages";
import { getConversationEventsSSEUrl } from "@/lib/api/conversation";

// Extend the API Message locally with client-only fields for optimistic UI
type Message = MatchMessage & {
  clientTempId?: string;
  clientStatus?: "pending" | "failed" | "sent";
};

type TypingState = Record<string, number>; // userId -> last typing timestamp (ms)
type ReadState = Record<string, number>;   // userId -> last read timestamp (ms)

export function useMatchMessages(conversationId: string, _token: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("connecting");

  // New: typing and read receipt state
  const [typingUsers, setTypingUsers] = useState<TypingState>({});
  const [readBy, setReadBy] = useState<ReadState>({});
  const getLastReadAtForOther = useCallback(
    (otherUserId: string): number => {
      return readBy[otherUserId] || 0;
    },
    [readBy],
  );
  const sseRef = useRef<EventSource | null>(null);

  const mergeIncomingMessage = useCallback(
    (incoming: Message) => {
      if (!incoming?._id || incoming.conversationId !== conversationId) return;

      setMessages((prev) => {
        // Fast path: already have the server message
        if (prev.some((m) => m._id === incoming._id)) return prev;

        const now = Date.now();
        const incomingFrom = (incoming as any).fromUserId;
        const incomingTo = (incoming as any).toUserId;
        const incomingText = (incoming as any).text;
        const incomingCreatedAt = Number((incoming as any).createdAt || 0);

        // Remove only tmp messages that are likely the optimistic version of this server message.
        // (Older code removed all tmp messages, which could incorrectly drop unrelated pending bubbles.)
        const likelyOptimisticWindowMs = 2 * 60 * 1000;

        const filtered = prev.filter((m) => {
          const id = m._id || m.id;
          if (!id || !id.startsWith("tmp-")) return true;

          const mFrom = (m as any).fromUserId;
          const mTo = (m as any).toUserId;
          const mText = (m as any).text;
          const mCreatedAt = Number((m as any).createdAt || 0);

          const sameDirection =
            incomingFrom && incomingTo
              ? mFrom === incomingFrom && mTo === incomingTo
              : true;
          const sameText =
            typeof incomingText === "string" && typeof mText === "string"
              ? incomingText.trim() === mText.trim()
              : false;

          const closeInTime =
            incomingCreatedAt > 0 && mCreatedAt > 0
              ? Math.abs(incomingCreatedAt - mCreatedAt) <= likelyOptimisticWindowMs
              : // Fallback if server message lacks timestamps
                now - mCreatedAt <= likelyOptimisticWindowMs;

          // If it looks like the optimistic duplicate, drop it.
          if (sameDirection && sameText && closeInTime) return false;
          return true;
        });

        return [...filtered, incoming];
      });
    },
    [conversationId]
  );

  const handleRealtimeEvent = useCallback(
    (data: any) => {
      // Preferred canonical envelope shape:
      // { v: 1, type, conversationId, userId?, createdAt, payload?: { ... } }
      // Back-compat: { type, message/readAt/at, ... }

      if (!data || typeof data !== "object") return;

      if (data.type === "message_sent") {
        const msg = (data?.payload?.message ?? data?.message) as Message | undefined;
        if (!msg) return;
        mergeIncomingMessage(msg);
        return;
      }

      if (data.type === "message_read") {
        const cid = data?.conversationId;
        const userId = data?.userId;
        const readAt = (data?.payload?.readAt ?? data?.readAt) as number | undefined;
        if (!cid || cid !== conversationId || !userId) return;
        setReadBy((prev) => ({ ...prev, [userId]: readAt || Date.now() }));
        return;
      }

      if (data.type === "typing_start" || data.type === "typing_stop") {
        const cid = data?.conversationId;
        const userId = data?.userId;
        const at = (data?.payload?.at ?? data?.at) as number | undefined;
        if (!cid || cid !== conversationId || !userId) return;
        setTypingUsers((prev) => {
          const next = { ...prev };
          if (data.type === "typing_start") next[userId] = at || Date.now();
          else delete next[userId];
          return next;
        });
        return;
      }

      // Backward-compat: some servers may emit raw message
      if (data?._id && data?.conversationId) {
        mergeIncomingMessage(data as Message);
      }
    },
    [conversationId, mergeIncomingMessage]
  );

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await matchMessagesAPI.getMessages({
        conversationId,
        limit: 20,
      });

      if ((response as any).success && (response as any).data) {
        const data = (response as any).data as Message[];
        setMessages(data);
        setHasMore(data.length === 20);
      } else if (Array.isArray(response)) {
        const data = response as Message[];
        setMessages(data);
        setHasMore(data.length === 20);
      } else {
        setError((response as any)?.error || "Failed to fetch messages");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const fetchOlder = useCallback(async () => {
    if (!hasMore || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    setError(null);
    try {
      const oldestTimestamp = Number(messages[0]?.createdAt);
      if (!Number.isFinite(oldestTimestamp) || oldestTimestamp <= 0) {
        setHasMore(false);
        return;
      }
      const response = await matchMessagesAPI.getMessages({
        conversationId,
        limit: 20,
        before: Number(oldestTimestamp),
      });

      if ((response as any).success && (response as any).data) {
        const data = (response as any).data as Message[];
        setMessages((prev) => [...data, ...prev]);
        if (data.length < 20) setHasMore(false);
      } else if (Array.isArray(response)) {
        const data = response as Message[];
        setMessages((prev) => [...data, ...prev]);
        if (data.length < 20) setHasMore(false);
      } else {
        setError((response as any)?.error || "Failed to fetch older messages");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch older messages");
    } finally {
      setLoadingOlder(false);
    }
  }, [hasMore, loadingOlder, messages, conversationId]);

  const sendMessage = useCallback(
    async (
      {
        fromUserId,
        toUserId,
        text,
      }: {
        fromUserId: string;
        toUserId: string;
        text: string;
      },
      existingTempId?: string
    ) => {
      setError(null);
      try {
        // dev log removed to satisfy no-console lint rule

        // Optimistic UI update
        const tmpId = existingTempId ?? `tmp-${Date.now()}`;
        if (existingTempId) {
          // Reusing a failed bubble: flip it back to pending
          setMessages((prev) =>
            prev.map((m) =>
              m._id === existingTempId
                ? { ...m, clientStatus: "pending", text }
                : m
            )
          );
        } else {
          const optimisticMsg: Message = {
            id: tmpId,
            _id: tmpId,
            conversationId,
            fromUserId,
            toUserId,
            text,
            type: "text",
            createdAt: Date.now(),
            clientTempId: tmpId,
            clientStatus: "pending",
          };
          setMessages((prev) => [...prev, optimisticMsg]);
        }

        matchMessagesAPI
          .sendMessage({
            fromUserId,
            toUserId,
            text,
            conversationId,
            type: "text",
          })
          .then((response: any) => {
            if (response.success && response.data) {
              const serverMsg = response.data as Message;
              setMessages((prev) => {
                const replaced = prev.map((m) =>
                  m._id === tmpId || m.clientTempId === tmpId
                    ? { ...serverMsg, clientStatus: "sent" as const }
                    : m
                );
                // Deduplicate if server also arrives via SSE later
                const unique = new Map<string, Message>();
                for (const m of replaced) {
                  const key = m.id || m._id;
                  if (key) unique.set(key, m as Message);
                }
                return Array.from(unique.values());
              });
            } else {
              setError(response.error || "Failed to send message");
              setMessages((prev) =>
                prev.map((m) =>
                  m._id === tmpId
                    ? { ...m, clientStatus: "failed" as const }
                    : m
                )
              );
            }
          })
          .catch((err: Error) => {
            setError(err.message || "Failed to send message");
            setMessages((prev) =>
              prev.map((m) =>
                m._id === tmpId ? { ...m, clientStatus: "failed" as const } : m
              )
            );
          });
      } finally {
        /* no-op */
      }
    },
    [conversationId]
  );

  // Initial fetch on mount or when conversation changes
  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  // Real-time updates via SSE with normalized event envelopes
  useEffect(() => {
    if (!conversationId) return;

    const conversationIdPattern = /^[a-zA-Z0-9_-]+$/;
    if (!conversationIdPattern.test(conversationId)) {
      return;
    }

    const url = getConversationEventsSSEUrl({ conversationId });
    let es: EventSource;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 1000;

    const connect = () => {
      es = new EventSource(url);
      sseRef.current = es;

      es.onopen = () => {
        reconnectAttempts = 0;
        setConnectionStatus("connected");
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealtimeEvent(data);
        } catch {
          // ignore parse errors
        }
      };

      // Some servers send a named event on open; handle it to mark optimistic 'delivered'
      // Note: EventSource in browsers doesn't expose on 'event' name easily without addEventListener
      es.addEventListener("open", () => {
        setConnectionStatus("connected");
      });

      es.onerror = () => {
        setConnectionStatus("disconnected");
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, reconnectAttempts);
          setTimeout(() => {
            reconnectAttempts++;
            es.close();
            connect();
          }, delay);
        } else {
          setError("Connection lost. Please refresh the page.");
        }
      };
    };

    connect();

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      } else if (es) {
        es.close();
      }
    };
  }, [conversationId, handleRealtimeEvent]);

  return {
    messages,
    loading,
    loadingOlder,
    hasMore,
    error,
    connectionStatus,
    fetchMessages,
    fetchOlder,
    sendMessage,
    typingUsers,
    readBy,
    getLastReadAtForOther,
  };
}
