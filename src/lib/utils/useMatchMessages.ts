import { useState, useCallback } from "react";
import { getMatchMessages, sendMatchMessage } from "./matchMessagesApi";

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
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const msgs = await getMatchMessages({ conversationId, token });
      setMessages(msgs);
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
      setLoading(true);
      setError(null);
      try {
        await sendMatchMessage({
          conversationId,
          fromUserId,
          toUserId,
          text,
          token,
        });
        await fetchMessages(); // Refresh after sending
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message || "Failed to send message");
        } else {
          setError("Failed to send message");
        }
      } finally {
        setLoading(false);
      }
    },
    [conversationId, token, fetchMessages]
  );

  return { messages, loading, error, fetchMessages, sendMessage };
}
