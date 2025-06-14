import { useState, useCallback, useEffect } from "react";
import { getMatchMessages, sendMatchMessage } from "@/lib/api/matchMessages";

// Message type for match messages
type Message = {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  createdAt: number;
};

export function useMatchMessages(conversationId: string, token: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const msgs = (await getMatchMessages({
        conversationId,
        token,
        limit: 20,
      })) as Message[];
      setMessages(msgs);
      setHasMore(msgs.length === 20);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Failed to fetch messages");
      } else {
        setError("Failed to fetch messages");
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId, token]);

  const fetchOlder = useCallback(async () => {
    if (!hasMore || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    setError(null);
    try {
      const oldestTimestamp = messages[0].createdAt;
      const older = (await getMatchMessages({
        conversationId,
        token,
        limit: 20,
        before: oldestTimestamp,
      })) as Message[];
      setMessages((prev) => [...older, ...prev]);
      if (older.length < 20) setHasMore(false);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Failed to fetch older messages");
      } else {
        setError("Failed to fetch older messages");
      }
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
        // Debug log
        console.log("[sendMatchMessage] payload", {
          conversationId,
          fromUserId,
          toUserId,
          text,
          token: token ? "<present>" : "<missing>",
        });

        // Optimistic UI update
        const optimisticMsg = {
          _id: `tmp-${Date.now()}`,
          conversationId,
          fromUserId,
          toUserId,
          text,
          createdAt: Date.now(),
        } as Message;
        setMessages((prev) => [...prev, optimisticMsg]);

        sendMatchMessage({
          conversationId,
          fromUserId,
          toUserId,
          text,
          token,
        })
          .then((saved) => {
            const savedMsg = saved as Message;
            setMessages((prev) =>
              prev.map((m) =>
                m._id && m._id.startsWith("tmp-") ? (savedMsg as Message) : m
              )
            );
          })
          .catch((err) => {
            if (err instanceof Error) {
              setError(err.message || "Failed to send message");
            } else {
              setError("Failed to send message");
            }
          });
      } finally {
        /* no-op */
      }
    },
    [conversationId, token]
  );

  // Initial fetch on mount or when conversation changes
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Preload next batch when hasMore true and not loading
  useEffect(() => {
    if (!hasMore || messages.length < 20) return;
    // Could prefetch here if desired using a timeout
  }, [hasMore, messages.length]);

  // Real-time updates via native Server-Sent Events
  useEffect(() => {
    if (!token) return;
    const url = `/api/conversations/${conversationId}/events?token=${token}`;
    const es = new EventSource(url);
    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as Message;
        setMessages((prev) => {
          // avoid duplicates (by _id)
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      } catch (e) {
        console.error("[SSE] Failed to parse message", e);
      }
    };
    es.onerror = (e) => {
      console.error("[SSE] error", e);
    };
    return () => {
      es.close();
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
  };
}
