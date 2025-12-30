import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { errorResponse, successResponse } from "@/lib/api/handler";
import { sendEmail } from "@/lib/email/resend";
import { db } from "@/lib/firebaseAdmin";

type Body = {
  dryRun?: boolean;
  confirm?: boolean;
  templateId?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  attachments?: Array<{ filename: string; content?: string }>;
};

export async function POST(request: NextRequest) {
  const { role, userId, email } = await requireAuth(request);
  if ((role || "user") !== "admin")
    return errorResponse("Admin privileges required", 403);

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const {
    dryRun,
    confirm,
    templateId,
    from = process.env.EMAIL_FROM || "Aroosi <no-reply@aroosi.app>",
    to,
    cc,
    bcc,
    subject,
    text,
    html,
    headers,
    attachments,
  } = body;

  if (!subject) return errorResponse("Subject is required", 400);
  if (!html && !text)
    return errorResponse("Either html or text content is required", 400);
  const recipients = (to || []).filter(Boolean);
  if (!dryRun && recipients.length === 0)
    return errorResponse("At least one recipient (to) is required", 400);

  if (dryRun) {
    // audit log (dry-run)
    try {
      await db.collection("adminSends").add({
        type: "email",
        mode: "dry-run",
        createdAt: Date.now(),
        actor: { userId, email },
        templateId: templateId || null,
        audience: {
          toCount: (to || []).filter(Boolean).length,
          ccCount: (cc || []).filter(Boolean).length,
          bccCount: (bcc || []).filter(Boolean).length,
        },
        previewOnly: true,
      });
    } catch (e) {
      console.warn("Failed to write admin send log (email dry-run)", e);
    }
    return successResponse({
      dryRun: true,
      preview: {
        from,
        to: recipients,
        cc: cc?.length ? cc : undefined,
        bcc: bcc?.length ? bcc : undefined,
        subject,
        text: text || undefined,
        html: html || undefined,
        headers: headers || undefined,
        attachments: attachments?.map((a) => ({ filename: a.filename })) || undefined,
      },
    });
  }

  if (!confirm) {
    return errorResponse("Confirmation required for live send", 400, {
      details: { hint: "Pass confirm: true or use dryRun: true" },
    });
  }

  if (!process.env.RESEND_API_KEY) {
    return errorResponse("Email provider not configured", 500);
  }

  try {
    const res = await sendEmail({
      from,
      to: recipients,
      subject,
      text: text || undefined,
      html: html || undefined,
      cc: cc && cc.length ? cc : undefined,
      bcc: bcc && bcc.length ? bcc : undefined,
      headers,
      attachments,
    });
    // Update template lastUsedAt if provided
    if (templateId && typeof templateId === "string") {
      try {
        await db.collection("emailTemplates").doc(templateId).set({ lastUsedAt: Date.now() }, { merge: true });
      } catch (e) {
        console.warn("Failed to update email template lastUsedAt", templateId, e);
      }
    }
    // audit success case
    try {
      await db.collection("adminSends").add({
        type: "email",
        mode: "live",
        createdAt: Date.now(),
        actor: { userId, email },
        templateId: templateId || null,
        audience: {
          toCount: (to || []).filter(Boolean).length,
          ccCount: (cc || []).filter(Boolean).length,
          bccCount: (bcc || []).filter(Boolean).length,
        },
        status: "queued",
      });
    } catch (e) {
      console.warn("Failed to write admin send log (email success)", e);
    }
    return successResponse({ queued: true, id: (res as any)?.id });
  } catch (err) {
    console.error("email send error", err);
    try {
      await db.collection("adminSends").add({
        type: "email",
        mode: "live",
        createdAt: Date.now(),
        actor: { userId, email },
        templateId: templateId || null,
        status: "error",
        error: String(err),
      });
    } catch (e) {
      console.warn("Failed to write admin send log (email catch)", e);
    }
    return errorResponse("Failed to queue email", 500);
  }
}
