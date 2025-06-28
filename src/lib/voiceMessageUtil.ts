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
 * Returns the saved `messages` row so the caller can append it to chat state.
 */
export async function uploadVoiceMessage({
  token,
  conversationId,
  fromUserId,
  toUserId,
  blob,
  mimeType = "audio/webm",
  duration,
}: {
  token: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  blob: Blob;
  mimeType?: string;
  duration: number; // seconds
}): Promise<VoiceMessage> {
  // Step 1: initialise Convex client
  const client = getConvexClient();
  if (!client) throw new Error("Failed to initialise Convex client");
  client.setAuth(token);

  // Step 2: get an upload URL
  const { uploadUrl } = (await client.mutation(
    api.messages.generateUploadUrl,
    {}
  )) as {
    uploadUrl: string;
  };
  if (!uploadUrl) throw new Error("Failed to obtain upload URL");

  // Step 3: upload the blob
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
    },
    body: blob,
  });

  if (!putRes.ok) {
    throw new Error("Failed to upload voice blob");
  }

  const { storageId } = (await putRes.json()) as { storageId: string };
  if (!storageId) throw new Error("storageId missing from upload response");

  // Step 4: create the message row
  const saved = (await client.mutation(api.messages.sendMessage, {
    conversationId,
    fromUserId: fromUserId as Id<"users">,
    toUserId: toUserId as Id<"users">,
    text: "", // voice messages have no text
    type: "voice",
    audioStorageId: storageId,
    duration,
    fileSize: blob.size,
    mimeType,
  })) as VoiceMessage;

  return saved;
}

/**
 * Fetch only voice messages for a conversation (ordered oldest->newest).
 */
export async function fetchVoiceMessages({
  token,
  conversationId,
}: {
  token: string;
  conversationId: string;
}): Promise<VoiceMessage[]> {
  const client = getConvexClient();
  if (!client) throw new Error("Failed to initialise Convex client");
  client.setAuth(token);

  const msgs = (await client.query(api.messages.getVoiceMessages, {
    conversationId,
  })) as VoiceMessage[];

  return msgs;
}
