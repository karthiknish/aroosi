import { adminMessaging, adminDb as db } from '@/lib/firebaseAdminInit';
import { v4 as uuid } from 'uuid';
import type { InAppNotification } from "@aroosi/shared/types";

// Local alias for shared type
type NotificationRecord = InAppNotification;

const COLLECTION = 'notifications';

export async function createInAppNotification(payload: Omit<NotificationRecord, 'id' | 'createdAt' | 'read'> & { read?: boolean }) {
  const now = Date.now();
  const id = uuid();
  await db.collection(COLLECTION).doc(id).set({ 
    read: false, // default
    ...payload, 
    id, 
    createdAt: now 
  });
  return { id, createdAt: now };
}

export async function listUserNotifications(userId: string, limit = 50, before?: number) {
  let q: FirebaseFirestore.Query = db.collection(COLLECTION)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit);
  if (before) {
    q = q.where('createdAt', '<', before);
  }
  const snap = await q.get();
  return snap.docs.map(d => d.data() as NotificationRecord);
}

export async function markNotificationsRead(userId: string, ids: string[]) {
  if (!Array.isArray(ids) || ids.length === 0) return { updated: 0 };
  const batch = db.batch();
  const ts = Date.now();
  for (const id of ids) {
    const ref = db.collection(COLLECTION).doc(id);
    batch.update(ref, { read: true, readAt: ts });
  }
  await batch.commit();
  return { updated: ids.length, readAt: ts };
}

export async function sendFcmNotificationToTokens(tokens: string[], title: string, body: string, data?: Record<string,string>) {
  if (!tokens.length) return { success: false, error: 'No tokens' };
  const message = {
    notification: { title, body },
    tokens,
    data: data || {},
  } as any;
  const res = await adminMessaging.sendEachForMulticast(message);
  return { success: true, response: res };
}
