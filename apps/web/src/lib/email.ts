import "server-only";
import { Resend } from "resend";
import { enqueueEmail } from "@/lib/emailQueue";
import React from "react";
import { render as renderEmail } from "@react-email/render";

// Lazy-initialize Resend to avoid requiring API key in test environment
let resendInstance: Resend | null = null;
function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY || "test_key";
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

type Address = string | { email: string; name?: string };

interface SendEmailOptions {
  to: Address | Address[];
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
    path?: string; // allow FS path where supported
    contentId?: string; // for inline images referenced via <img src="cid:...">
  }>;
  // Resend supports tags as array of { name, value }
  tags?: Array<string> | Array<{ name: string; value: string }>;
  scheduledAt?: number; // epoch ms; provider may require ISO string
  metadata?: Record<string, any>; // campaignId, category, templateKey, abVariant, etc.
  // Send via Resend React rendering (direct send only, not via queue)
  react?: unknown; // React.ReactElement, kept as unknown to avoid adding react type dep here
  // Convenience: add List-Unsubscribe headers for one-click
  unsubscribeUrl?: string;
  // Extras
  generateTextFromHtml?: boolean; // if true and text is absent, derive from HTML
  priority?: "high" | "normal" | "low"; // adds X-Priority/Importance headers
  listId?: string; // List-Id header
  idempotencyKey?: string; // forwarded as header (if supported by provider)
  inReplyTo?: string; // thread headers
  references?: string | string[];
  messageId?: string;
}

export const sendEmail = async (options: SendEmailOptions) => {
  try {
    const resend = getResend();
    // Validate from fields: either use `from` or (`fromEmail`/`fromName`), not both
    if (options.from && (options.fromEmail || options.fromName)) {
      console.warn(
        "sendEmail: both `from` and (`fromEmail`/`fromName`) provided. Using `from` and ignoring fromEmail/fromName."
      );
    }
    // Helper: format name/email display
    const formatAddress = (addr: Address): string => {
      if (typeof addr === "string") return addr;
      const e = addr.email.trim();
      const n = (addr.name || "").trim();
      return n ? `${n} <${e}>` : e;
    };
    const toValue = Array.isArray(options.to)
      ? (options.to as Address[]).map(formatAddress)
      : formatAddress(options.to as Address);

    // Inject preheader for better inbox preview
    const preheaderHtml = options.preheader
      ? `<div style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${options.preheader}</div>`
      : "";
    const htmlWithPreheader = `${preheaderHtml}${options.html || ""}`;
    // Optional plain text generation
    const textContent =
      options.text ||
      (options.generateTextFromHtml && options.html
        ? String(options.html)
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        : undefined);
    // Normalize tags to Resend's expected shape
    let tags: any = undefined;
    if (Array.isArray(options.tags)) {
      if (options.tags.length && typeof options.tags[0] === "string") {
        tags = (options.tags as string[]).map((t) => ({
          name: "tag",
          value: String(t),
        }));
      } else {
        tags = options.tags;
      }
    } else if (options.tags && !Array.isArray(options.tags)) {
      // if someone passes a map/object in the future
      tags = Object.entries(options.tags as any).map(([name, value]) => ({
        name,
        value: String(value),
      }));
    }
    // Unsubscribe headers
    const headers: Record<string, string> = { ...(options.headers || {}) };
    if (options.unsubscribeUrl) {
      headers["List-Unsubscribe"] = `<${options.unsubscribeUrl}>`;
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }
    if (options.listId) headers["List-Id"] = options.listId;
    if (options.idempotencyKey)
      headers["Idempotency-Key"] = options.idempotencyKey;
    if (options.inReplyTo) headers["In-Reply-To"] = options.inReplyTo;
    if (options.messageId) headers["Message-Id"] = options.messageId;
    if (options.references) {
      const refs = Array.isArray(options.references)
        ? options.references.join(" ")
        : options.references;
      headers["References"] = refs;
    }
    if (options.priority) {
      const p = options.priority;
      if (p === "high") {
        headers["X-Priority"] = "1 (Highest)";
        headers["X-MSMail-Priority"] = "High";
        headers["Importance"] = "High";
      } else if (p === "low") {
        headers["X-Priority"] = "5 (Lowest)";
        headers["X-MSMail-Priority"] = "Low";
        headers["Importance"] = "Low";
      }
    }
    const payload: any = {
      from:
        options.from ||
        (options.fromEmail
          ? options.fromName
            ? `${options.fromName} <${options.fromEmail}>`
            : options.fromEmail
          : "Aroosi <noreply@aroosi.app>"),
      to: toValue,
      subject: options.subject,
      // Prefer react if supplied; fallback to html/text
      react: options.react,
      html: options.react
        ? undefined
        : options.html
          ? htmlWithPreheader
          : undefined,
      text: textContent,
      cc: options.cc,
      bcc: options.bcc,
      reply_to: options.replyTo,
      headers,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
        path: a.path,
        content_id: a.contentId,
      })),
      tags,
      scheduled_at: options.scheduledAt
        ? new Date(options.scheduledAt).toISOString()
        : undefined,
    };
    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error("Error sending email:", error);
      return { error };
    }

    return { data };
  } catch (error) {
    console.error("Error sending email:", error);
    return { error };
  }
};

export const sendAdminNotification = async (
  subject: string,
  html: string,
  options?: {
    text?: string;
    replyTo?: string | string[];
    cc?: string[];
    bcc?: string[];
    headers?: Record<string, string>;
    tags?: Array<string> | Array<{ name: string; value: string }>;
    from?: string;
    fromEmail?: string;
    fromName?: string;
  }
) => {
  const raw = process.env.ADMIN_EMAIL;
  if (!raw || raw.trim().length === 0) {
    console.error("ADMIN_EMAIL environment variable not set");
    return { error: "Admin email not configured" } as const;
  }
  // Support comma/semicolon separated list of recipients
  const recipients = raw
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  await enqueueEmail({
    to: recipients.length === 1 ? recipients[0] : recipients,
    subject: `[Admin Notification] ${subject}`,
    html,
    text: options?.text,
    cc: options?.cc,
    bcc: options?.bcc,
    replyTo: options?.replyTo,
    headers: options?.headers,
    tags: options?.tags as any,
    from: options?.from,
    fromEmail: options?.fromEmail,
    fromName: options?.fromName,
    metadata: { type: "admin_notification" },
  });
  return { queued: true } as const;
};

export const sendUserNotification = async (
  email: string,
  subject: string,
  htmlOrReact: string | unknown,
  extra?: {
    preheader?: string;
    category?: string;
    campaignId?: string;
    headers?: Record<string, string>;
    tags?: Array<string> | Array<{ name: string; value: string }>;
    abVariant?: "A" | "B";
    cc?: string[];
    bcc?: string[];
    replyTo?: string | string[];
    attachments?: Array<{
      filename: string;
      content?: string | Buffer;
      contentType?: string;
      path?: string;
      contentId?: string;
    }>;
    scheduledAt?: number;
    text?: string;
    from?: string;
    unsubscribeUrl?: string;
    // New extras
    fromEmail?: string;
    fromName?: string;
    generateTextFromHtml?: boolean;
    priority?: "high" | "normal" | "low";
    listId?: string;
    idempotencyKey?: string;
    inReplyTo?: string;
    references?: string | string[];
    messageId?: string;
    maxAttempts?: number;
  }
) => {
  let html: string;
  if (typeof htmlOrReact === "string") {
    html = htmlOrReact;
  } else if (React.isValidElement(htmlOrReact as any)) {
    html = await renderEmail(htmlOrReact as any);
  } else {
    html = String(htmlOrReact ?? "");
  }
  await enqueueEmail({
    to: email,
    subject,
    html,
    text: extra?.text,
    from: extra?.from,
    fromEmail: extra?.fromEmail,
    fromName: extra?.fromName,
    cc: extra?.cc,
    bcc: extra?.bcc,
    replyTo: extra?.replyTo,
    headers: extra?.headers,
    attachments: extra?.attachments,
    tags: extra?.tags as any,
    scheduledAt: extra?.scheduledAt,
    generateTextFromHtml: extra?.generateTextFromHtml,
    priority: extra?.priority,
    listId: extra?.listId,
    idempotencyKey: extra?.idempotencyKey,
    inReplyTo: extra?.inReplyTo,
    references: extra?.references,
    messageId: extra?.messageId,
    maxAttempts: extra?.maxAttempts,
    metadata: {
      type: "user_notification",
      category: extra?.category,
      campaignId: extra?.campaignId,
      abVariant: extra?.abVariant,
    },
    preheader: extra?.preheader,
    // Note: unsubscribeUrl is incorporated by sendEmail via headers at send time.
  });
  return { queued: true };
};

// Categorized variant to enable downstream filtering/opt-outs per category
export const sendCategorizedUserEmail = async (
  email: string,
  subject: string,
  htmlOrReact: string | unknown,
  category?: string,
  preheader?: string,
  options?: {
    campaignId?: string;
    headers?: Record<string, string>;
    tags?: Array<string> | Array<{ name: string; value: string }>;
    abVariant?: "A" | "B";
    cc?: string[];
    bcc?: string[];
    replyTo?: string | string[];
    attachments?: Array<{
      filename: string;
      content?: string | Buffer;
      contentType?: string;
      path?: string;
      contentId?: string;
    }>;
    scheduledAt?: number;
    text?: string;
    from?: string;
    unsubscribeUrl?: string;
    fromEmail?: string;
    fromName?: string;
    generateTextFromHtml?: boolean;
    priority?: "high" | "normal" | "low";
    listId?: string;
    idempotencyKey?: string;
    inReplyTo?: string;
    references?: string | string[];
    messageId?: string;
  }
) => {
  let html: string;
  if (typeof htmlOrReact === "string") {
    html = htmlOrReact;
  } else if (React.isValidElement(htmlOrReact as any)) {
    html = await renderEmail(htmlOrReact as any);
  } else {
    html = String(htmlOrReact ?? "");
  }
  await enqueueEmail({
    to: email,
    subject,
    html,
    text: options?.text,
    preheader,
    from: options?.from,
    fromEmail: options?.fromEmail,
    fromName: options?.fromName,
    cc: options?.cc,
    bcc: options?.bcc,
    replyTo: options?.replyTo,
    headers: options?.headers,
    attachments: options?.attachments,
    tags: options?.tags as any,
    scheduledAt: options?.scheduledAt,
    generateTextFromHtml: options?.generateTextFromHtml,
    priority: options?.priority,
    listId: options?.listId,
    idempotencyKey: options?.idempotencyKey,
    inReplyTo: options?.inReplyTo,
    references: options?.references,
    messageId: options?.messageId,
    metadata: {
      type: "user_notification",
      category,
      campaignId: options?.campaignId,
      abVariant: options?.abVariant,
    },
  });
  return { queued: true };
};

// Direct-send variant for Resend React emails (skips queue; immediate delivery attempt)
export const sendReactEmailNow = async (
  to: string | string[],
  subject: string,
  reactElement: unknown,
  options?: Omit<SendEmailOptions, "to" | "subject" | "react">
) => {
  return sendEmail({ to, subject, react: reactElement, ...(options || {}) });
};

// Helper to create inline image attachments easily. Use with <img src="cid:YOUR_CONTENT_ID" /> in HTML.
export function inlineImageAttachment(params: {
  filename: string;
  content: string | Buffer;
  contentType: string;
  contentId: string;
}) {
  return {
    filename: params.filename,
    content: params.content,
    contentType: params.contentType,
    contentId: params.contentId,
  } as const;
}
