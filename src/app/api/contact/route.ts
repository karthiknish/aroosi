import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { sendAdminNotification, sendUserNotification } from "@/lib/email";
import { errorResponse } from "@/lib/apiResponse";
import {
  contactFormAdminTemplate,
  contactFormUserAckTemplate,
} from "@/lib/emailTemplates";

// Simple in-memory rate limit store (replace with Redis for production)
const rateLimitMap = new Map<string, { count: number; last: number }>();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 5;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = getConvexClient();
  if (!convex) return errorResponse("Convex client not configured", 500);
  convex.setAuth(token);
  // Only admin can list contact submissions
  const result = await convex.query(api.contact.contactSubmissions, {});
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  // Public endpoint: do not require authentication
  // Rate limiting by IP
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
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }
  const convex = getConvexClient();
  if (!convex) return errorResponse("Convex client not configured", 500);
  // Do not set auth for public queries
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Missing or invalid body" },
      { status: 400 },
    );
  }
  const { email, name, subject, message } = body;
  if (
    typeof email !== "string" ||
    typeof name !== "string" ||
    typeof subject !== "string" ||
    typeof message !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing or invalid contact fields" },
      { status: 400 },
    );
  }
  try {
    const result = await convex.mutation(api.contact.submitContact, {
      email,
      name,
      subject,
      message,
    });

    // Fire-and-forget email notifications (no need to block response)
    void (async () => {
      try {
        // Notify admin
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
          userTemplate.html,
        );
      } catch (e) {
        // Silently log – notification failure shouldn't break API
        console.error("Failed to send contact form emails", e);
      }
    })();

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message =
      typeof err === "object" && err && "message" in err
        ? String((err as { message?: unknown }).message)
        : "Failed to submit contact form";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
