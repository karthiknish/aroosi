// Conversation API utilities

/**
 * Returns the SSE URL for conversation events (for use with EventSource).
 * @param {string} conversationId - The conversation ID
 * @param {string} token - Auth token
 * @returns {string} - The SSE URL with token as query param
 */
export function getConversationEventsSSEUrl({
  conversationId,
}: {
  conversationId: string;
}) {
  // Cookie-session: server reads identity from HttpOnly cookies; no token in URL
  return `/api/conversations/${encodeURIComponent(conversationId)}/events`;
}

/**
 * Marks a conversation as read for the current user.
 * @param {string} conversationId - The conversation ID
 * @param {string} token - Auth token
 * @returns {Promise<{ success: boolean; error?: string }>} - The API response
 */
export async function markConversationRead({
  conversationId,
}: {
  conversationId: string;
}) {
  const res = await fetch(`/api/messages/mark-read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId }),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || "Failed to mark conversation as read");
  }
  return json;
}

export async function getPresence(userId: string): Promise<{ isOnline: boolean; lastSeen: number }> {
  const res = await fetch(`/api/presence?userId=${encodeURIComponent(userId)}`, {
    headers: { "Content-Type": "application/json" },
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || "Failed to fetch presence");
  }
  return json.data as { isOnline: boolean; lastSeen: number };
}

export async function heartbeat(): Promise<void> {
  try {
    await fetch(`/api/presence`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "online" }),
    });
  } catch {
    // ignore network errors silently
  }
}

/**
 * Fetches the user's conversations from the API.
 * @param {string} token - Auth token
 * @returns {Promise<{ conversations: Array<{ id: string; participants: string[]; lastMessage?: string; updatedAt: number }> }>} - The conversations data
 */
export async function getConversations(): Promise<unknown> {
  const res = await fetch("/api/conversations", {
    headers: {
      // Cookie-based session; no Authorization header
      "Content-Type": "application/json",
    },
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || "Failed to fetch conversations");
  }
  return json.data || json;
}
