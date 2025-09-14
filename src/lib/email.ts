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

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
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
}

export const sendEmail = async (options: SendEmailOptions) => {
  try {
    const resend = getResend();
    // Inject preheader for better inbox preview
    const preheaderHtml = options.preheader
      ? `<div style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${options.preheader}</div>`
      : "";
    const htmlWithPreheader = `${preheaderHtml}${options.html || ""}`;
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
    }
    // Unsubscribe headers
    const headers: Record<string, string> | undefined = options.unsubscribeUrl
      ? {
          ...options.headers,
          "List-Unsubscribe": `<${options.unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : options.headers;
    const payload: any = {
      from: options.from || "Aroosi <noreply@aroosi.app>",
      to: options.to,
      subject: options.subject,
      // Prefer react if supplied; fallback to html/text
      react: options.react,
      html: options.react
        ? undefined
        : options.html
          ? htmlWithPreheader
          : undefined,
      text: options.text,
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

export const sendAdminNotification = async (subject: string, html: string) => {
  if (!process.env.ADMIN_EMAIL) {
    console.error("ADMIN_EMAIL environment variable not set");
    return { error: "Admin email not configured" };
  }
  // Enqueue instead of direct send
  await enqueueEmail({
    to: process.env.ADMIN_EMAIL,
    subject: `[Admin Notification] ${subject}`,
    html,
    metadata: { type: "admin_notification" },
  });
  return { queued: true };
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
    cc: extra?.cc,
    bcc: extra?.bcc,
    replyTo: extra?.replyTo,
    headers: extra?.headers,
    attachments: extra?.attachments,
    tags: extra?.tags as any,
    scheduledAt: extra?.scheduledAt,
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
    cc: options?.cc,
    bcc: options?.bcc,
    replyTo: options?.replyTo,
    headers: options?.headers,
    attachments: options?.attachments,
    tags: options?.tags as any,
    scheduledAt: options?.scheduledAt,
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
