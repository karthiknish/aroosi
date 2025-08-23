import { NextRequest } from "next/server";
import { z } from "zod";
import { sendAdminNotification, sendUserNotification } from "@/lib/email";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import {
  applySecurityHeaders,
  validateSecurityRequirements,
  checkApiRateLimit,
} from "@/lib/utils/securityHeaders";
import { requireAdminSession } from "@/app/api/_utils/auth";
import {
  contactFormAdminTemplate,
  contactFormUserAckTemplate,
} from "@/lib/emailTemplates";
import { db } from "@/lib/firebaseAdmin";

// Legacy rate limit constants (still enforced via manual IP map + global helper if needed)
const rateLimitMap = new Map<string, { count: number; last: number }>();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 5;

// Zod schema for contact form validation
const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email")
    .max(254, "Email is too long"),
  subject: z
    .string()
    .trim()
    .min(5, "Subject must be at least 5 characters")
    .max(120, "Subject is too long"),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message is too long"),
});

function toPositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function GET(req: NextRequest) {
  const session = await requireAdminSession(req);
  if ("errorResponse" in session)
    return applySecurityHeaders(session.errorResponse);
  try {
    const searchParams = req.nextUrl.searchParams;
    const source = searchParams.get("source"); // "vip" to fetch vip-contact
    const page = toPositiveInt(searchParams.get("page"), NaN);
    const pageSize = toPositiveInt(
      searchParams.get("pageSize") ?? searchParams.get("limit"),
      NaN
    );
    // Firestore query ordered by createdAt desc
    const collectionName =
      source === "vip" ? "vip-contact" : "contactSubmissions";
    const snap = await db
      .collection(collectionName)
      .orderBy("createdAt", "desc")
      .get();
    const all = snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => ({
      id: d.id,
      _id: d.id,
      ...(d.data() as any),
    }));
    const total = all.length;
    let payload = all;
    const isPaginated = Number.isFinite(page) && Number.isFinite(pageSize);
    if (isPaginated) {
      const safeSize = Math.min(Math.max(pageSize, 1), 200);
      const safePage = Math.max(page, 1);
      const start = (safePage - 1) * safeSize;
      payload = all.slice(start, start + safeSize);
      const res = new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Total-Count": String(total),
          "X-Page": String(safePage),
          "X-Page-Size": String(safeSize),
        },
      });
      return applySecurityHeaders(res);
    }
  const res = new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
    return applySecurityHeaders(res);
  } catch (e) {
    return applySecurityHeaders(errorResponse(e, 500));
  }
}

export async function POST(req: NextRequest) {
  const security = validateSecurityRequirements(req as unknown as Request);
  if (!security.valid)
    return applySecurityHeaders(
      errorResponse(security.error ?? "Invalid request", 400)
    );

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, last: now };
  if (now - entry.last > RATE_LIMIT_WINDOW) {
    entry.count = 0;
    entry.last = now;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((entry.last + RATE_LIMIT_WINDOW - now) / 1000)
    );
    const res = errorResponse(
      "Too many requests. Please try again later.",
      429,
      { retryAfterSeconds }
    );
    res.headers.set("Retry-After", String(retryAfterSeconds));
    return applySecurityHeaders(res);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(errorResponse("Invalid JSON body", 400));
  }
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success)
    return applySecurityHeaders(
      errorResponse("Validation failed", 422, {
        issues: parsed.error.flatten(),
      })
    );
  const { email, name, subject, message } = parsed.data;
  const correlationId = crypto.randomUUID();
  try {
    await db
      .collection("contactSubmissions")
      .add({ email, name, subject, message, createdAt: Date.now() });
    void (async () => {
      try {
        const adminTemplate = contactFormAdminTemplate({
          name,
          email,
          message,
        });
        await sendAdminNotification(adminTemplate.subject, adminTemplate.html);
        const userTemplate = contactFormUserAckTemplate({ name });
        await sendUserNotification(
          email,
          userTemplate.subject,
          userTemplate.html
        );
      } catch (e) {
        console.error("Failed to send contact form emails", e);
      }
    })();
    return applySecurityHeaders(
      successResponse({ success: true, correlationId })
    );
  } catch (err) {
    return applySecurityHeaders(errorResponse(err, 500, { correlationId }));
  }
}
