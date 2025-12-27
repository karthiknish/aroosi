/**
 * Thin wrappers over matchMessages API to avoid duplication.
 * Keeps backward compatibility for existing imports.
 */
import { matchMessagesAPI, type MatchMessage, type ApiResponse } from "@/lib/api/matchMessages";
import type { MessageType } from "@aroosi/shared/types";
import { fetchJson, postJson, getJson } from "@/lib/http/client";
import { showErrorToast } from "@/lib/ui/toast";

export type Message = MatchMessage;

export const getMessages = async (
  conversationId: string,
  limit?: number,
  before?: number
): Promise<Message[]> => {
  const res = await matchMessagesAPI.getMessages({
    conversationId,
    ...(typeof limit === "number" ? { limit } : {}),
    ...(typeof before === "number" ? { before } : {}),
  });

  if (!res.success) {
    showErrorToast(null, res.error?.message || "Failed to fetch messages");
    return [];
  }

  return res.data || [];
};

export const sendMessage = async (message: {
  text?: string;
  toUserId: string;
  conversationId: string;
  fromUserId: string;
  type?: MessageType;
  audioStorageId?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
}): Promise<Message | null> => {
  const res = await matchMessagesAPI.sendMessage({
    conversationId: message.conversationId,
    fromUserId: message.fromUserId,
    toUserId: message.toUserId,
    text: message.text,
    type: message.type,
    audioStorageId: message.audioStorageId,
    duration: message.duration,
    fileSize: message.fileSize,
    mimeType: message.mimeType,
  });

  if (!res.success) {
    showErrorToast(null, res.error?.message || "Failed to send message");
    return null;
  }

  return res.data || null;
};

export const markConversationRead = async (
  conversationId: string
): Promise<{ success: boolean }> => {
  // Prefer canonical /api/messages/mark-read wrapper
  const res = await matchMessagesAPI.markConversationAsRead({
    conversationId,
    userId: "", // server derives from token; field ignored if not needed
  });

  if (!res.success) {
    showErrorToast(
      null,
      res.error?.message || "Failed to mark conversation as read"
    );
    return { success: false };
  }

  return { success: true };
};

export const deleteMessage = async (
  messageId: string
): Promise<{ success: boolean }> => {
  try {
    const result = await postJson<{
      success?: boolean;
      error?: string;
    }>(
      `/api/messages/${encodeURIComponent(messageId)}`,
      {},
      {
        method: "DELETE",
      }
    );

    if (!result?.success) {
      throw new Error(result?.error || "Failed to delete message");
    }

    return { success: true };
  } catch (error: any) {
    const msg =
      error instanceof Error ? error.message : "Failed to delete message";
    showErrorToast(null, msg);
    throw error;
  }
};

export const editMessage = async (
  messageId: string,
  text: string
): Promise<{ success: boolean }> => {
  try {
    const result = await postJson<{
      success?: boolean;
      error?: string;
    }>(
      `/api/messages/${encodeURIComponent(messageId)}`,
      { text },
      {
        method: "PATCH",
      }
    );

    if (!result?.success) {
      throw new Error(result?.error || "Failed to edit message");
    }

    return { success: true };
  } catch (error: any) {
    const msg =
      error instanceof Error ? error.message : "Failed to edit message";
    showErrorToast(null, msg);
    throw error;
  }
};

/**
 * Upload an image for a chat message
 */
export const uploadMessageImage = async (
  file: File,
  conversationId: string,
  fromUserId: string,
  toUserId: string,
  signal?: AbortSignal
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  resetTime?: number;
}> => {
  try {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("conversationId", conversationId);
    formData.append("fromUserId", fromUserId);
    formData.append("toUserId", toUserId);
    formData.append("fileName", file.name);
    formData.append("contentType", file.type || "application/octet-stream");

    // IMPORTANT: do NOT set Content-Type manually for FormData.
    // The browser will set multipart boundaries; setting JSON headers breaks parsing.
    const result = await fetchJson<{
      success?: boolean;
      messageId?: string;
      error?: string;
      resetTime?: number;
    }>("/api/messages/upload-image", {
      method: "POST",
      body: formData,
      signal,
    });

    if (!result?.success) {
      return {
        success: false,
        error: result?.error || "Upload failed",
        resetTime: result?.resetTime,
      };
    }

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error: any) {
    let errMsg = `HTTP ${error.status || 500}`;
    let resetTime: number | undefined;

    try {
      const data = error.response ? await error.response.clone().json() : {};
      errMsg = data?.error || data?.message || errMsg;
      if (error.status === 429 && data?.resetTime) {
        const ms = new Date(data.resetTime).getTime() - Date.now();
        resetTime = Math.max(0, Math.ceil(ms / 1000));
        errMsg = `Rate limit exceeded. Try again in ${resetTime}s`;
      } else if (error.status === 429) {
        errMsg = errMsg || "Rate limit exceeded";
      }
    } catch {
      const txt = error.response ? await error.response.text() : "";
      errMsg = txt || errMsg;
    }

    return {
      success: false,
      error: errMsg,
      resetTime,
    };
  }
};

/**
 * Get the URL for a message image
 */
export const getMessageImageUrl = async (
  messageId: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
  try {
    const result = await getJson<{
      success?: boolean;
      data?: { imageUrl?: string };
      imageUrl?: string;
      error?: string;
    }>(`/api/message-images/${encodeURIComponent(messageId)}/url`);

    if (!result?.success) {
      return {
        success: false,
        error: result?.error || "Failed to get image URL",
      };
    }

    const imageUrl = result?.data?.imageUrl || result?.imageUrl;
    if (!imageUrl) {
      return {
        success: false,
        error: "Image URL missing",
      };
    }

    return {
      success: true,
      imageUrl,
    };
  } catch (error: any) {
    let errMsg = "Failed to get image URL";
    try {
      const data = error.response ? await error.response.json() : {};
      errMsg = data?.error || data?.message || errMsg;
    } catch {
      // ignore
    }

    return {
      success: false,
      error: errMsg,
    };
  }
};
