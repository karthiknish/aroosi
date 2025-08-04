import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import type { Id } from "@convex/_generated/dataModel";

export interface VoiceMessage {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  type: "voice";
  audioStorageId: string;
  duration: number;
  fileSize?: number;
  mimeType?: string;
  createdAt: number;
  readAt?: number;
}

/**
 * Upload a recorded voice blob and create the corresponding message record.
 *
 * Returns the saved `messages` rows so the caller can append them to chat state.
 * Note: This util currently fetches multiple voice messages by conversation.
 */
export async function uploadVoiceMessage({
  conversationId,
  fromUserId,
  toUserId,
  blob,
  mimeType = "audio/webm",
  duration,
}: {
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  blob: Blob;
  mimeType?: string;
  duration: number; // seconds
}): Promise<VoiceMessage[]> {
  // Step 1: initialise Convex client
  const client = getConvexClient();
  if (!client) throw new Error("Failed to initialise Convex client");

  // TODO: Implement upload and send flow here if needed. For now, fetch existing
  // voice messages in this conversation to return a list.
  const msgs = (await client.query(api.messages.getVoiceMessages, {
    conversationId,
  })) as VoiceMessage[];

  return msgs;
}
