import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";
import { uploadVoiceMessage as uploadVoiceMessageRequest } from "@/lib/api/voiceMessages";

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

type VoiceMessageRecord = Omit<VoiceMessage, "_id"> & {
  audioUrl?: string | null;
};

/**
 * Upload a recorded voice blob and create the corresponding message record.
 *
 * Returns the saved `messages` rows so the caller can append them to chat state.
 * Note: This util currently fetches multiple voice messages by conversation.
 */

/**
 * Upload a recorded voice blob via the backend API endpoint.
 * Returns the saved message row so the caller can append it to chat state.
 * 
 * NOTE: Direct Firebase Storage uploads are disabled by security rules.
 * All voice message uploads must go through the server-side API.
 */
export async function uploadVoiceMessage({
  conversationId,
  toUserId,
  blob,
  mimeType = "audio/webm",
  duration,
}: {
  conversationId: string;
  toUserId: string;
  blob: Blob;
  mimeType?: string;
  duration: number;
}): Promise<VoiceMessage> {
  if (!blob) throw new Error("No audio blob provided");

  // Build FormData for the API endpoint
  const formData = new FormData();
  const ext = mimeType.includes("webm")
    ? "webm"
    : mimeType.includes("m4a")
      ? "m4a"
      : "webm";
  formData.append("audio", blob, `voice-${Date.now()}.${ext}`);
  formData.append("conversationId", conversationId);
  formData.append("toUserId", toUserId);
  formData.append("duration", String(duration));

  const result = await uploadVoiceMessageRequest(formData);
  if (!result.success) {
    throw new Error(result.error || "Upload failed");
  }

  if (result.message) {
    return result.message;
  }

  // Return a VoiceMessage-compatible object
  return {
    _id: result.messageId || "",
    conversationId,
    fromUserId: conversationId.split("_").find((id) => id !== toUserId) || "",
    toUserId,
    type: "voice",
    audioStorageId: result.storageId || "",
    duration: result.duration || duration,
    fileSize: blob.size,
    mimeType,
    createdAt: Date.now(),
  };
}

/**
 * Fetch all voice messages for a conversation from Firestore.
 * Returns an array of VoiceMessage objects with audio URLs.
 */
export async function fetchVoiceMessages(
  conversationId: string
): Promise<VoiceMessage[]> {
  const q = query(
    collection(db, "voiceMessages"),
    where("conversationId", "==", conversationId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc: DocumentData) => {
    const data = doc.data() as Partial<VoiceMessageRecord>;
    const normalized: VoiceMessageRecord = {
      conversationId: data.conversationId || conversationId,
      fromUserId: data.fromUserId || "",
      toUserId: data.toUserId || "",
      type: "voice",
      audioStorageId: data.audioStorageId || "",
      ...data,
      audioUrl: data.audioUrl ?? null,
      duration: data.duration ?? 0,
      createdAt: data.createdAt || Date.now(),
    };
    // Placeholder handling: ensure audioUrl/duration keys exist for UI even if backend hasn't populated them yet
    return { _id: doc.id, ...normalized };
  });
}
