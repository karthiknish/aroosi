// Firestore-backed email queue abstraction for Resend sending
// Provides enqueue + attempt delivery + logging pattern

import { adminDb } from '@/lib/firebaseAdminInit';
import { sendEmail } from '@/lib/email';

export interface QueuedEmail {
  id?: string;
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  preheader?: string;
  status?: "queued" | "sending" | "sent" | "error" | "retry";
  error?: string;
  attempts?: number;
  maxAttempts?: number;
  createdAt?: number;
  updatedAt?: number;
  sentAt?: number;
  lastAttemptAt?: number;
  nextVisibleAt?: number; // scheduled time for next retry (backoff)
  metadata?: Record<string, any>;
  providerResponseId?: string;
}

const COLLECTION = 'emails_outbox';
const DEFAULT_MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 30_000; // 30s initial backoff
const MAX_BACKOFF_MS = 15 * 60_000; // 15 min cap

export async function enqueueEmail(email: Omit<QueuedEmail, 'status' | 'attempts' | 'createdAt' | 'updatedAt'>) {
  const now = Date.now();
  const docRef = await adminDb.collection(COLLECTION).add({
    ...email,
    status: 'queued',
    attempts: 0,
    maxAttempts: email.maxAttempts || DEFAULT_MAX_ATTEMPTS,
    createdAt: now,
  updatedAt: now,
  nextVisibleAt: now
  });
  return docRef.id;
}

// Process a single queued email (idempotent)
export async function processEmail(docId: string) {
  const ref = adminDb.collection(COLLECTION).doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, reason: 'not_found' } as const;
  const data = snap.data() as QueuedEmail;

  if (data.status === 'sent') return { ok: true, already: true } as const;
  if (data.status === 'sending') return { ok: false, reason: 'in_progress' } as const;
  if (data.attempts && data.attempts >= (data.maxAttempts || DEFAULT_MAX_ATTEMPTS)) {
    return { ok: false, reason: 'exhausted' } as const;
  }
  const now = Date.now();
  if (data.nextVisibleAt && data.nextVisibleAt > now) {
    return { ok: false, reason: 'not_due' } as const;
  }
  await ref.set({ status: 'sending', updatedAt: now, lastAttemptAt: now }, { merge: true });
  const result = await sendEmail({
    to: data.to,
    subject: data.subject,
    html: data.html,
    from: data.from,
    preheader: data.preheader,
  });
  if ((result as any).error) {
    const attempts = (data.attempts || 0) + 1;
    const exhausted = attempts >= (data.maxAttempts || DEFAULT_MAX_ATTEMPTS);
    // exponential backoff: base * 2^(attempts-1)
    const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, attempts - 1), MAX_BACKOFF_MS);
    const nextVisibleAt = exhausted ? null : Date.now() + backoff;
    await ref.set({
      status: exhausted ? 'error' : 'retry',
      error: String((result as any).error),
      attempts,
      updatedAt: Date.now(),
      nextVisibleAt
    }, { merge: true });
    return { ok: false, reason: exhausted ? 'error' : 'retry' } as const;
  }
  const providerId = (result as any).data?.id || (result as any).data?.messageId;
  await ref.set({ status: 'sent', sentAt: Date.now(), updatedAt: Date.now(), providerResponseId: providerId }, { merge: true });
  return { ok: true } as const;
}

// Batch processor: fetch a page of queued/retry emails and process sequentially
export async function processEmailBatch(limit = 10) {
  const now = Date.now();
  const query = await adminDb.collection(COLLECTION)
    .where('status', 'in', ['queued', 'retry'])
    .where('nextVisibleAt', '<=', now)
    .orderBy('nextVisibleAt', 'asc')
    .limit(limit)
    .get();
  const results: any[] = [];
  for (const doc of query.docs) {
    const res = await processEmail(doc.id);
    results.push({ id: doc.id, ...res });
  }
  return results;
}
