import { showErrorToast } from "@/lib/ui/toast";

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

export async function toggleReaction(
  messageId: string,
  emoji: string
): Promise<ApiResponse<{ messageId: string; emoji: string }>> {
  try {
    const res = await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, emoji }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `HTTP ${res.status}`);
    }
    return { success: true, data: { messageId, emoji } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to toggle reaction";
    showErrorToast(null, msg);
    return { success: false, error: msg };
  }
}

export async function getReactions(
  conversationId: string
): Promise<ApiResponse<{ reactions: Array<{ id: string; messageId: string; userId: string; emoji: string; updatedAt: number }> }>> {
  try {
    const res = await fetch(`/api/reactions?conversationId=${encodeURIComponent(conversationId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return { success: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load reactions";
    return { success: false, error: msg };
  }
}


