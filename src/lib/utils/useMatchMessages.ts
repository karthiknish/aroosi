import { useState, useCallback } from "react";
import { getMatchMessages, sendMatchMessage } from "./matchMessagesApi";

export function useMatchMessages(conversationId: string, token: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const msgs = await getMatchMessages({ conversationId, token });
      setMessages(msgs);
    } catch (err: any) {
      setError(err.message || "Failed to fetch messages");
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
      } catch (err: any) {
        setError(err.message || "Failed to send message");
      } finally {
        setLoading(false);
      }
    },
    [conversationId, token, fetchMessages]
  );

  return { messages, loading, error, fetchMessages, sendMessage };
}
