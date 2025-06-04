export async function getMatchMessages({
  conversationId,
  token,
}: {
  conversationId: string;
  token: string;
}) {
  const res = await fetch(
    `/api/match-messages?conversationId=${encodeURIComponent(conversationId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) {
    throw new Error((await res.json()).error || "Failed to fetch messages");
  }
  return res.json();
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
  if (!res.ok) {
    throw new Error((await res.json()).error || "Failed to send message");
  }
  return res.json();
}
