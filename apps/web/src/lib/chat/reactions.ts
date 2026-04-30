import { postJson, getJson } from "@/lib/http/client";
import type { ApiResponse } from "@/lib/utils/apiResponse";
import { handleError } from "@/lib/utils/errorHandling";

export async function toggleReaction(
  messageId: string,
  emoji: string
): Promise<ApiResponse<{ messageId: string; emoji: string }>> {
  try {
    const result = await postJson<{ success?: boolean; error?: string }>(
      "/api/reactions",
      { messageId, emoji }
    );

    if (!result?.success) {
      throw new Error(result?.error || "Failed to toggle reaction");
    }

    return { success: true, data: { messageId, emoji } };
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to toggle reaction";
    handleError(
      error,
      { scope: "chat/reactions", action: "toggle_reaction", messageId, emoji },
      { customUserMessage: msg }
    );
    return {
      success: false,
      error: {
        code: "REACTION_ERROR",
        message: msg,
        details: error,
      },
    };
  }
}

export async function getReactions(conversationId: string): Promise<
  ApiResponse<{
    reactions: Array<{
      id: string;
      messageId: string;
      userId: string;
      emoji: string;
      updatedAt: number;
    }>;
  }>
> {
  try {
    const result = await getJson<{
      success?: boolean;
      error?: string;
      reactions?: Array<{
        id: string;
        messageId: string;
        userId: string;
        emoji: string;
        updatedAt: number;
      }>;
    }>(`/api/reactions?conversationId=${encodeURIComponent(conversationId)}`);

    if (!result?.success) {
      throw new Error(result?.error || "Failed to load reactions");
    }

    return { success: true, data: { reactions: result.reactions || [] } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load reactions";
    return {
      success: false,
      error: {
        code: "REACTION_ERROR",
        message: msg,
        details: e,
      },
    };
  }
}


