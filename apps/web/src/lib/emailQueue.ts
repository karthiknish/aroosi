// Firestore-backed email queue abstraction for Resend sending
// Provides enqueue + attempt delivery + logging pattern

import { adminDb } from '@/lib/firebaseAdminInit';
// Import the provider-level sender to avoid circular dependency with lib/email
import { sendEmail } from '@/lib/email/resend';

export interface QueuedEmail {
  id?: string;
  to:
    | string
    | { email: string; name?: string }
    | Array<string | { email: string; name?: string }>;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  fromEmail?: string;
  fromName?: string;
  preheader?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string | string[];
  headers?: Record<string, string>;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    contentType?: string;
    path?: string;
  }>;
  tags?: Array<string> | Array<{ name: string; value: string }>;
  scheduledAt?: number;
  generateTextFromHtml?: boolean;
  priority?: "high" | "normal" | "low";
  listId?: string;
  idempotencyKey?: string;
  inReplyTo?: string;
  references?: string | string[];
  messageId?: string;
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
  providerResponse?: any;
}

const COLLECTION = "emails_outbox";
const DEFAULT_MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 30_000; // 30s initial backoff
const MAX_BACKOFF_MS = 15 * 60_000; // 15 min cap

export async function enqueueEmail(
  email: Omit<QueuedEmail, "status" | "attempts" | "createdAt" | "updatedAt">
) {
  const now = Date.now();
  const docRef = await adminDb.collection(COLLECTION).add({
    ...email,
    status: "queued",
    attempts: 0,
    maxAttempts: email.maxAttempts || DEFAULT_MAX_ATTEMPTS,
    createdAt: now,
    updatedAt: now,
    nextVisibleAt: now,
  });
  return docRef.id;
}

// Process a single queued email (idempotent)
export async function processEmail(docId: string) {
  const ref = adminDb.collection(COLLECTION).doc(docId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, reason: "not_found" } as const;
  const data = snap.data() as QueuedEmail;

  if (data.status === "sent") return { ok: true, already: true } as const;
  if (data.status === "sending")
    return { ok: false, reason: "in_progress" } as const;
  if (
    data.attempts &&
    data.attempts >= (data.maxAttempts || DEFAULT_MAX_ATTEMPTS)
  ) {
    return { ok: false, reason: "exhausted" } as const;
  }
  const now = Date.now();
  if (data.nextVisibleAt && data.nextVisibleAt > now) {
    return { ok: false, reason: "not_due" } as const;
  }
  await ref.set(
    { status: "sending", updatedAt: now, lastAttemptAt: now },
    { merge: true }
  );
  // Merge latest campaign settings (if present) at send time
  let mergedPriority = data.priority;
  let mergedListId = data.listId;
  let mergedHeaders = { ...(data.headers || {}) } as Record<string, string>;
  try {
    const campaignId = data.metadata?.campaignId as string | undefined;
    if (campaignId) {
      const campaignSnap = await adminDb
        .collection("marketing_email_campaigns")
        .doc(campaignId)
        .get();
      if (campaignSnap.exists) {
        const c = campaignSnap.data() as any;
        const settings = c?.settings || {};
        if (settings.priority) mergedPriority = settings.priority;
        if (settings.listId) mergedListId = settings.listId;
        if (settings.headers && typeof settings.headers === "object") {
          mergedHeaders = { ...mergedHeaders, ...settings.headers };
        }
      }
    }
  } catch {}

  // Skip processing if campaign is paused/cancelled
  try {
    const campaignId = data.metadata?.campaignId as string | undefined;
    if (campaignId) {
      const campaignSnap = await adminDb
        .collection("marketing_email_campaigns")
        .doc(campaignId)
        .get();
      if (campaignSnap.exists) {
        const status = (campaignSnap.data() as any)?.status;
        if (status === "paused" || status === "cancelled") {
          await ref.set(
            {
              status: status === "paused" ? "queued" : "error",
              updatedAt: Date.now(),
            },
            { merge: true }
          );
          return { ok: false, reason: status } as const;
        }
      }
    }
  } catch {}

  // Normalize addresses for provider
  const formatAddress = (addr: string | { email: string; name?: string }) => {
    if (typeof addr === "string") return addr;
    return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
  };
  const toArray: string[] = Array.isArray(data.to)
    ? (data.to as Array<string | { email: string; name?: string }>).map(
        formatAddress
      )
    : [formatAddress(data.to as any)];

  // Choose a from address
  const fromAddress: string =
    data.from ||
    (data.fromEmail
      ? data.fromName
        ? `${data.fromName} <${data.fromEmail}>`
        : data.fromEmail
      : "Aroosi <noreply@aroosi.app>");

  // Inject preheader if provided
  const preheaderHtml = data.preheader
    ? `<div style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${data.preheader}</div>`
    : "";
  const htmlWithPreheader = `${preheaderHtml}${data.html || ""}`;

  // Derive text from HTML if requested
  const textContent =
    data.text ||
    (data.generateTextFromHtml && data.html
      ? String(data.html)
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      : undefined);

  // Map headers and special fields
  const headers = { ...mergedHeaders } as Record<string, string>;
  if (data.replyTo)
    headers["Reply-To"] = Array.isArray(data.replyTo)
      ? data.replyTo.join(", ")
      : data.replyTo;
  if (mergedListId) headers["List-Id"] = mergedListId;
  if (data.idempotencyKey) headers["Idempotency-Key"] = data.idempotencyKey;
  if (data.inReplyTo) headers["In-Reply-To"] = data.inReplyTo;
  if (data.messageId) headers["Message-Id"] = data.messageId;
  if (data.references)
    headers["References"] = Array.isArray(data.references)
      ? data.references.join(" ")
      : (data.references as string);
  if (mergedPriority === "high") {
    headers["X-Priority"] = "1 (Highest)";
    headers["X-MSMail-Priority"] = "High";
    headers["Importance"] = "High";
  } else if (mergedPriority === "low") {
    headers["X-Priority"] = "5 (Lowest)";
    headers["X-MSMail-Priority"] = "Low";
    headers["Importance"] = "Low";
  }

  const result = await sendEmail({
    from: fromAddress,
    to: toArray,
    subject: data.subject,
    html: htmlWithPreheader || undefined,
    text: textContent,
    cc: data.cc && data.cc.length ? data.cc : undefined,
    bcc: data.bcc && data.bcc.length ? data.bcc : undefined,
    headers,
    attachments: data.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content as any,
      contentType: a.contentType,
    })),
  });
  if ((result as any).error) {
    const attempts = (data.attempts || 0) + 1;
    const exhausted = attempts >= (data.maxAttempts || DEFAULT_MAX_ATTEMPTS);
    // exponential backoff: base * 2^(attempts-1)
    const backoff = Math.min(
      BASE_BACKOFF_MS * Math.pow(2, attempts - 1),
      MAX_BACKOFF_MS
    );
    const nextVisibleAt = exhausted ? null : Date.now() + backoff;
    await ref.set(
      {
        status: exhausted ? "error" : "retry",
        error: String((result as any).error),
        attempts,
        updatedAt: Date.now(),
        nextVisibleAt,
      },
      { merge: true }
    );
    return { ok: false, reason: exhausted ? "error" : "retry" } as const;
  }
  const providerId =
    (result as any).data?.id || (result as any).data?.messageId;
  await ref.set(
    {
      status: "sent",
      sentAt: Date.now(),
      updatedAt: Date.now(),
      providerResponseId: providerId,
      providerResponse: (result as any).data,
    },
    { merge: true }
  );
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
