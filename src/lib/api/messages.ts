/**
 * Thin wrappers over matchMessages API to avoid duplication.
 * Keeps backward compatibility for existing imports.
 */
import { matchMessagesAPI, type MatchMessage, type ApiResponse } from "@/lib/api/matchMessages";

export type Message = MatchMessage;

export const getMessages = async (
  conversationId: string,
  limit?: number,
  before?: number,
): Promise<Message[]> => {
  const res = await matchMessagesAPI.getMessages(null, {
    conversationId,
    ...(typeof limit === "number" ? { limit } : {}),
    ...(typeof before === "number" ? { before } : {}),
  }) as unknown as ApiResponse<Message[]>;
  // matchMessagesAPI returns ApiResponse in some methods; support both shapes
  if (res && typeof res === "object" && "success" in (res as any)) {
    return ((res as ApiResponse<Message[]>).data ?? []) as Message[];
  }
  const asObj = res as unknown as { messages?: Message[]; data?: Message[] };
  return (
    asObj?.messages || asObj?.data || ((res as unknown as Message[]) ?? [])
  );
};

export const sendMessage = async (message: {
  text?: string;
  toUserId: string;
  conversationId: string;
  fromUserId: string;
  type?: "text" | "voice" | "image";
  audioStorageId?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
}): Promise<Message | null> => {
  const res = await matchMessagesAPI.sendMessage(null, {
    conversationId: message.conversationId,
    fromUserId: message.fromUserId,
    toUserId: message.toUserId,
    text: message.text,
    type: message.type,
    audioStorageId: message.audioStorageId,
    duration: message.duration,
    fileSize: message.fileSize,
    mimeType: message.mimeType,
  }) as unknown as ApiResponse<Message>;
  if (res && typeof res === "object" && "success" in res) {
    if (!res.success) throw new Error(res.error || "Failed to send message");
    return (res.data as Message) ?? null;
  }
  // Fallback for direct shapes
  return (res as unknown as { message?: Message }).message ?? (res as unknown as Message);
};

export const markConversationRead = async (
  conversationId: string,
): Promise<{ success: boolean }> => {
  // Prefer canonical /api/messages/mark-read wrapper
  const res = await matchMessagesAPI.markConversationAsRead(null, {
    conversationId,
    userId: "", // server derives from token; field ignored if not needed
  }) as unknown as ApiResponse<void>;
  if (res && typeof res === "object" && "success" in res) {
    return { success: res.success };
  }
  // Fallback parse
  return { success: true };
};
