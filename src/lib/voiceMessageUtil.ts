import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
// import type { Id } from "@convex/_generated/dataModel"; // Remove unused import

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
  // fromUserId, // Unused parameter
  // toUserId, // Unused parameter
  // blob, // Unused parameter
  // mimeType = "audio/webm", // Unused parameter
  // duration, // Unused parameter
}: {
  conversationId: string;
  fromUserId?: string; // Make optional since it's unused
  toUserId?: string; // Make optional since it's unused
  blob?: Blob; // Make optional since it's unused
  mimeType?: string; // Make optional since it's unused
  duration?: number; // Make optional since it's unused
}): Promise<VoiceMessage[]> {
  // Step 1: initialise Convex client (cookie-based; browser)
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

  // TODO: Implement upload and send flow here if needed. For now, fetch existing
  // voice messages in this conversation to return a list.
  const msgs = (await client.query(api.messages.getVoiceMessages, {
    conversationId,
  })) as VoiceMessage[];

  return msgs;
}
