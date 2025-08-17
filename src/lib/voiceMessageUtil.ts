import { auth, storage, db } from "@/lib/firebaseClient";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
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
 * Upload a recorded voice blob and create the corresponding message record in Firestore.
 * Returns the saved message row so the caller can append it to chat state.
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
  const ext = mimeType.includes("webm")
    ? "webm"
    : mimeType.includes("m4a")
      ? "m4a"
      : "webm";
  const audioPath = `voice/${user.uid}/${conversationId}/${Date.now()}_${uuidv4()}.${ext}`;
  const storageRef = ref(storage, audioPath);
  const metadata = {
    contentType: mimeType,
    customMetadata: {
      uploadedBy: user.uid,
      originalName: `voice-${Date.now()}.${ext}`,
    },
  } as any;
  const task = uploadBytesResumable(storageRef, blob, metadata);

  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      undefined,
      (err) => reject(err),
      () => resolve()
    );
  });

  const audioUrl = await getDownloadURL(storageRef);
  const now = Date.now();
  const docRef = await addDoc(collection(db, "voiceMessages"), {
    conversationId,
    fromUserId: user.uid,
    toUserId,
    type: "voice",
    audioStorageId: audioPath,
    audioUrl,
    duration,
    fileSize: blob.size,
    mimeType,
    createdAt: now,
  });
  const { getDoc } = await import("firebase/firestore");
  const docSnap = await getDoc(docRef);
  return { _id: docRef.id, ...docSnap.data() } as VoiceMessage;
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
