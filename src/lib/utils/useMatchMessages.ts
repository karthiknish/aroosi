import { useState, useCallback, useEffect } from "react";
import {
  getMatchMessages,
  sendMatchMessage,
  type MatchMessage,
} from "@/lib/api/matchMessages";
import { getConversationEventsSSEUrl } from "@/lib/api/conversation";

// Use the MatchMessage type from the API
type Message = MatchMessage;

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
      const response = await getMatchMessages({
        conversationId,
        token,
        limit: 20,
      });

      if (response.success && response.data) {
        setMessages(response.data);
        setHasMore(response.data.length === 20);
      } else {
        setError(response.error?.message || "Failed to fetch messages");
      }
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
      const response = await getMatchMessages({
        conversationId,
        token,
        limit: 20,
        before: oldestTimestamp,
      });

      if (response.success && response.data) {
        setMessages((prev) => [...response.data!, ...prev]);
        if (response.data.length < 20) setHasMore(false);
      } else {
        setError(response.error?.message || "Failed to fetch older messages");
      }
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
        // Debug log (remove in production)
        if (process.env.NODE_ENV === "development") {
          console.log("[sendMatchMessage] payload", {
            conversationId,
            fromUserId,
            toUserId,
            text: text.substring(0, 50) + (text.length > 50 ? "..." : ""), // Truncate for privacy
            token: token ? "<present>" : "<missing>",
          });
        }

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
          fromUserId,
          toUserId,
          text,
          conversationId,
          token,
          type: "text",
        })
          .then((response) => {
            if (response.success && response.data) {
              setMessages((prev) =>
                prev.map((m) =>
                  m._id && m._id.startsWith("tmp-") ? response.data! : m
                )
              );
            } else {
              setError(response.error?.message || "Failed to send message");
              // Remove optimistic message on failure
              setMessages((prev) =>
                prev.filter((m) => !m._id?.startsWith("tmp-"))
              );
            }
          })
          .catch((err) => {
            if (err instanceof Error) {
              setError(err.message || "Failed to send message");
            } else {
              setError("Failed to send message");
            }
            // Remove optimistic message on failure
            setMessages((prev) =>
              prev.filter((m) => !m._id?.startsWith("tmp-"))
            );
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

  // Preload next batch when hasMore true and not loading
  useEffect(() => {
    if (!hasMore || messages.length < 20) return;
    // Could prefetch here if desired using a timeout
  }, [hasMore, messages.length]);

  // Real-time updates via Server-Sent Events with enhanced security
  useEffect(() => {
    if (!token || !conversationId) return;

    // Validate conversation ID format before making SSE connection
    const conversationIdPattern = /^[a-zA-Z0-9_-]+$/;
    if (!conversationIdPattern.test(conversationId)) {
      console.error("[SSE] Invalid conversation ID format");
      return;
    }

    // Use utility to get SSE URL (token as query param)
    const url = getConversationEventsSSEUrl({ conversationId, token });

    let es: EventSource;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 1000; // Start with 1 second

    const connect = () => {
      es = new EventSource(url);

      es.onopen = () => {
        console.log("[SSE] Connection opened");
        reconnectAttempts = 0; // Reset on successful connection
      };

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as Message;

          // Validate message structure
          if (!msg._id || !msg.conversationId || !msg.text) {
            console.warn("[SSE] Received invalid message structure:", msg);
            return;
          }

          // Verify message belongs to this conversation
          if (msg.conversationId !== conversationId) {
            console.warn("[SSE] Received message for different conversation");
            return;
          }

          setMessages((prev) => {
            // Avoid duplicates (by _id)
            if (prev.some((m) => m._id === msg._id)) return prev;
            return [...prev, msg];
          });
        } catch (e) {
          console.error("[SSE] Failed to parse message:", e);
        }
      };

      es.onerror = (e) => {
        console.error("[SSE] Connection error:", e);

        // Attempt reconnection with exponential backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, reconnectAttempts);
          console.log(
            `[SSE] Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`,
          );

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
      if (es) {
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
  };
}
