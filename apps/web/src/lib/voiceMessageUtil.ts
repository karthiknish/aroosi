import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  DocumentData,
} from "firebase/firestore";

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
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  if (!blob) throw new Error("No audio blob provided");

  // Get auth token for API call
  const token = await user.getIdToken();

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

  // Call the backend API endpoint
  const response = await fetch("/api/voice-messages/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed: ${response.status}`);
  }

  const result = await response.json();

  // Return a VoiceMessage-compatible object
  return {
    _id: result.data?.messageId || result.messageId || "",
    conversationId,
    fromUserId: user.uid,
    toUserId,
    type: "voice",
    audioStorageId: result.data?.storageId || result.storageId || "",
    duration,
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
    const data = doc.data();
    // Placeholder handling: ensure audioUrl/duration keys exist for UI even if backend hasn't populated them yet
    if (!("audioUrl" in data)) {
      (data as any).audioUrl = null; // caller can show loading or fetch on-demand
    }
    if (!("duration" in data)) {
      (data as any).duration = 0;
    }
    return { _id: doc.id, ...data } as VoiceMessage;
  });
}
