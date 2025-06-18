// Match messages API helpers (shared)
export async function getMatchMessages({
  conversationId,
  token,
  limit,
  before,
}: {
  conversationId: string;
  token: string;
  limit?: number;
  before?: number;
}) {
  const queryParams = [
    `conversationId=${encodeURIComponent(conversationId)}`,
    limit ? `limit=${limit}` : null,
    before !== undefined ? `before=${before}` : null,
  ]
    .filter(Boolean)
    .join("&");
  const res = await fetch(`/api/match-messages?${queryParams}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Failed to fetch messages");
  }
  return (json.data ?? []) as unknown[];
}

export async function sendMatchMessage({
  conversationId,
  fromUserId,
  toUserId,
  text,
  token,
}: {
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  token: string;
}) {
  const res = await fetch("/api/match-messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ conversationId, fromUserId, toUserId, text }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || "Failed to send message");
  }
  return json.data;
}
