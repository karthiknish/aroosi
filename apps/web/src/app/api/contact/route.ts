import {
  createApiHandler,
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { sendAdminNotification, sendUserNotification } from "@/lib/email";
import {
  contactFormAdminTemplate,
  contactFormUserAckTemplate,
} from "@/lib/emailTemplates";
import { db } from "@/lib/firebaseAdmin";
import { contactSubmissionSchema } from "@/lib/validation/apiSchemas/contact";

function toPositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Admin-only GET for listing submissions
export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    // Check admin role
    const user = ctx.user as any;
    const role = user?.role || user?.customClaims?.role;
    if (role !== "admin" && role !== "superadmin") {
      return errorResponse("Admin access required", 403, { correlationId: ctx.correlationId });
    }

    try {
      const searchParams = new URL(ctx.request.url).searchParams;
      const source = searchParams.get("source");
      const page = toPositiveInt(searchParams.get("page"), NaN);
      const pageSize = toPositiveInt(searchParams.get("pageSize") ?? searchParams.get("limit"), NaN);
      
      const collectionName = source === "vip" ? "vip-contact" : "contactSubmissions";
      const snap = await db.collection(collectionName).orderBy("createdAt", "desc").get();
      const all = snap.docs.map((d: any) => ({ id: d.id, _id: d.id, ...d.data() }));
      
      const total = all.length;
      let payload = all;
      const isPaginated = Number.isFinite(page) && Number.isFinite(pageSize);
      
      if (isPaginated) {
        const safeSize = Math.min(Math.max(pageSize, 1), 200);
        const safePage = Math.max(page, 1);
        const start = (safePage - 1) * safeSize;
        payload = all.slice(start, start + safeSize);
        
        const res = successResponse(payload, 200, ctx.correlationId);
        res.headers.set("X-Total-Count", String(total));
        res.headers.set("X-Page", String(safePage));
        res.headers.set("X-Page-Size", String(safeSize));
        return res;
      }
      
      return successResponse(payload, 200, ctx.correlationId);
    } catch (e) {
      console.error("contact GET error", { error: e, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch submissions", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "contact_admin_get", maxRequests: 60 }
  }
);

// Public POST for contact form submissions
export const POST = createApiHandler(
  async (
    ctx: ApiContext,
    body: import("zod").infer<typeof contactSubmissionSchema>
  ) => {
    const { email, name, subject, message } = body;
    
    try {
      await db.collection("contactSubmissions").add({
        email,
        name,
        subject,
        message,
        createdAt: Date.now(),
      });
      
      // Send emails in background
      void (async () => {
        try {
          const adminTemplate = contactFormAdminTemplate({ name, email, message });
          await sendAdminNotification(`[Contact] ${adminTemplate.subject}`, adminTemplate.html, {
            replyTo: `${name} <${email}>`,
            headers: { "X-Category": "contact" },
          });
          const userTemplate = contactFormUserAckTemplate({ name });
          await sendUserNotification(email, userTemplate.subject, userTemplate.html);
        } catch (e) {
          console.error("Failed to send contact form emails", e);
        }
      })();
      
      return successResponse({ message: "Contact form submitted" }, 200, ctx.correlationId);
    } catch (err) {
      console.error("contact POST error", { error: err, correlationId: ctx.correlationId });
      return errorResponse("Failed to submit contact form", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    requireAuth: false,
    bodySchema: contactSubmissionSchema,
    rateLimit: { identifier: "contact_submit", maxRequests: 5 }
  }
);
