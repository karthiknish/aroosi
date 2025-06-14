export async function sendGeminiChat({
  messages,
  email,
}: {
  messages: { role: string; text: string }[];
  email: string;
}): Promise<{ reply: string }> {
  const res = await fetch("/api/gemini-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, email }),
  });
  if (!res.ok) {
    throw new Error("Failed to get chat response");
  }
  return await res.json();
}
