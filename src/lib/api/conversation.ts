// Conversation API utilities

/**
 * Returns the SSE URL for conversation events (for use with EventSource).
 * @param {string} conversationId - The conversation ID
 * @param {string} token - Auth token
 * @returns {string} - The SSE URL with token as query param
 */
export function getConversationEventsSSEUrl({
  conversationId,
  token,
}: {
  conversationId: string;
  token: string;
}) {
  return `/api/conversations/${encodeURIComponent(conversationId)}/events?token=${encodeURIComponent(token)}`;
}

/**
 * Marks a conversation as read for the current user.
 * @param {string} conversationId - The conversation ID
 * @param {string} token - Auth token
 * @returns {Promise<{ success: boolean; error?: string }>} - The API response
 */
export async function markConversationRead({
  conversationId,
  token,
}: {
  conversationId: string;
  token: string;
}) {
  const res = await fetch(
    `/api/conversations/${encodeURIComponent(conversationId)}/mark-read`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || "Failed to mark conversation as read");
  }
  return json;
}

/**
 * Fetches the user's conversations from the API.
 * @param {string} token - Auth token
 * @returns {Promise<{ conversations: Array<{ id: string; participants: string[]; lastMessage?: string; updatedAt: number }> }>} - The conversations data
 */
export async function getConversations({ token }: { token: string }) {
  const res = await fetch("/api/conversations", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || "Failed to fetch conversations");
  }
  return json.data || json;
}
