export async function sendGeminiChat({
  messages,
  email,
}: {
  messages: { role: string; text: string }[];
  email: string;
}): Promise<{ reply: string }> {
  const { aiAPI } = await import("@/lib/api/ai");
  return await aiAPI.geminiChat(messages, email);
}
