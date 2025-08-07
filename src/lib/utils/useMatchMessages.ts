import { useState, useCallback, useEffect, useRef } from "react";
import { matchMessagesAPI, type MatchMessage } from "@/lib/api/matchMessages";
import { getConversationEventsSSEUrl } from "@/lib/api/conversation";

// Use the MatchMessage type from the API
type Message = MatchMessage;

type TypingState = Record<string, number>; // userId -> last typing timestamp (ms)
type ReadState = Record<string, number>;   // userId -> last read timestamp (ms)

export function useMatchMessages(conversationId: string, _token: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await matchMessagesAPI.getMessages(null, {
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
      const oldestTimestamp = messages[0].createdAt;
      const response = await matchMessagesAPI.getMessages(null, {
        conversationId,
        limit: 20,
        before: oldestTimestamp,
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
  }, [hasMore, loadingOlder, messages, conversationId, token]);

  const sendMessage = useCallback(
    async ({
      fromUserId,
      toUserId,
      text,
    }: {
      fromUserId: string;
      toUserId: string;
      text: string;
    }) => {
      setError(null);
      try {
        if (process.env.NODE_ENV === "development") {
          console.log("[sendMatchMessage] payload", {
            conversationId,
            fromUserId,
            toUserId,
            text: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
            token: token ? "<present>" : "<missing>",
          });
        }

        // Optimistic UI update
        const tmpId = `tmp-${Date.now()}`;
        const optimisticMsg = {
          _id: tmpId,
          conversationId,
          fromUserId,
          toUserId,
          text,
          createdAt: Date.now(),
        } as Message;
        setMessages((prev) => [...prev, optimisticMsg]);

        matchMessagesAPI
          .sendMessage(null, {
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
                  m._id === tmpId || m._id?.startsWith("tmp-") ? serverMsg : m
                );
                // Deduplicate if server also arrives via SSE later
                const unique = new Map<string, Message>();
                for (const m of replaced) unique.set(m._id, m);
                return Array.from(unique.values());
              });
            } else {
              setError(response.error || "Failed to send message");
              setMessages((prev) => prev.filter((m) => m._id !== tmpId));
            }
          })
          .catch((err: Error) => {
            setError(err.message || "Failed to send message");
            setMessages((prev) => prev.filter((m) => m._id !== tmpId));
          });
      } finally {
        /* no-op */
      }
    },
    [conversationId, token]
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
      console.error("[SSE] Invalid conversation ID format");
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
        console.log("[SSE] Connection opened");
        reconnectAttempts = 0;
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          // Handle normalized event envelopes
          if (payload?.type === "message_sent" && payload?.message) {
            const msg = payload.message as Message;
            if (!msg?._id || msg.conversationId !== conversationId) return;
            setMessages((prev) => {
              if (prev.some((m) => m._id === msg._id)) return prev;
              // Replace any optimistic tmp if same text/fromUser matches closely
              const withoutTmp = prev.filter((m) => !m._id?.startsWith("tmp-"));
              return [...withoutTmp, msg];
            });
            return;
          }

          if (payload?.type === "message_read") {
            const { userId, readAt, conversationId: cid } = payload;
            if (!cid || cid !== conversationId || !userId) return;
            setReadBy((prev) => ({ ...prev, [userId]: readAt || Date.now() }));
            // Optional: update message read flags locally if needed
            return;
          }

          if (payload?.type === "typing_start" || payload?.type === "typing_stop") {
            const { userId, conversationId: cid, at } = payload;
            if (!cid || cid !== conversationId || !userId) return;
            setTypingUsers((prev) => {
              const next = { ...prev };
              if (payload.type === "typing_start") {
                next[userId] = at || Date.now();
              } else {
                delete next[userId];
              }
              return next;
            });
            return;
          }

          // Backward-compat: some servers may emit raw message
          if (payload?._id && payload?.conversationId) {
            const msg = payload as Message;
            if (msg.conversationId !== conversationId) return;
            setMessages((prev) => {
              if (prev.some((m) => m._id === msg._id)) return prev;
              const withoutTmp = prev.filter((m) => !m._id?.startsWith("tmp-"));
              return [...withoutTmp, msg];
            });
          }
        } catch (e) {
          console.error("[SSE] Failed to parse event:", e);
        }
      };

      es.onerror = (e) => {
        console.error("[SSE] Connection error:", e);
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, reconnectAttempts);
          setTimeout(() => {
            reconnectAttempts++;
            es.close();
            connect();
          }, delay);
        } else {
          console.error("[SSE] Max reconnection attempts reached");
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
  }, [conversationId, token]);

  return {
    messages,
    loading,
    loadingOlder,
    hasMore,
    error,
    fetchMessages,
    fetchOlder,
    sendMessage,
    typingUsers,
    readBy,
    getLastReadAtForOther,
  };
}
