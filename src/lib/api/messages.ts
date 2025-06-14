export async function markConversationRead({
  conversationId,
  userId,
  token,
}: {
  conversationId: string;
  userId: string;
  token: string;
}) {
  await fetch("/api/messages/read", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ conversationId, userId }),
  });
  return true;
}
