import { db, adminStorage } from "@/lib/firebaseAdmin";
import { v4 as uuid } from "uuid";
import type { MessageType } from "@aroosi/shared/types";

export interface FirebaseMessage {
  id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  type: MessageType;
  text?: string;
  audioStorageId?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  peaks?: number[];
  createdAt: number;
  readAt?: number;
}

const COLLECTION = "messages";

export async function sendFirebaseMessage(data: Omit<FirebaseMessage, "id" | "createdAt"> & { text?: string }) {
  const now = Date.now();
  const docRef = db.collection(COLLECTION).doc();
  const payload: FirebaseMessage = { id: docRef.id, createdAt: now, ...data } as FirebaseMessage;
  await docRef.set(payload);
  return payload;
}

export async function listConversationMessages(conversationId: string, limit?: number, before?: number) {
  let q = db.collection(COLLECTION).where("conversationId", "==", conversationId).orderBy("createdAt", "desc");
  if (before) q = q.where("createdAt", "<", before);
  if (limit) q = q.limit(limit);
  const snap = await q.get();
  const items: FirebaseMessage[] = snap.docs.map((d: any) => d.data() as FirebaseMessage);
  return items.sort((a,b) => a.createdAt - b.createdAt);
}

export async function markMessagesRead(conversationId: string, userId: string) {
  const snap = await db.collection(COLLECTION).where("conversationId", "==", conversationId).where("toUserId", "==", userId).get();
  const unread = snap.docs.filter((d: any) => !(d.data() as any).readAt);
  if (unread.length === 0) return { updated: 0, readAt: Date.now() };
  const batch = db.batch();
  const ts = Date.now();
  unread.forEach((docRef: any) => batch.update(docRef.ref, { readAt: ts }));
  await batch.commit();
  return { updated: unread.length, readAt: ts };
}

export async function uploadMessageImage(params: { conversationId: string; fileName: string; contentType: string; bytes: Uint8Array; }) {
  const id = uuid();
  const path = `messages/${params.conversationId}/${id}_${params.fileName}`;
  // Resolve bucket defensively: adminStorage.bucket() may throw if no default bucket
  // was configured during firebase-admin initialization. Fall back to env-derived
  // bucket name if necessary, matching logic used in other image routes.
  let bucket: any;
  try {
    bucket = adminStorage.bucket();
  } catch (e) {
    const fallbackName =
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      (process.env.GCLOUD_PROJECT
        ? `${process.env.GCLOUD_PROJECT}.appspot.com`
        : undefined);
    if (!fallbackName) throw e;
    bucket = adminStorage.bucket(fallbackName);
  }
  const file = bucket.file(path);
  await file.save(Buffer.from(params.bytes), {
    contentType: params.contentType,
    resumable: false,
    public: false,
  });
  return { storageId: path };
}
