import { NextRequest } from "next/server";
import { z } from "zod";
import {
  createApiHandler,
  ErrorCode,
  errorResponse,
  successResponse,
} from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";

const bodySchema = z
  .object({
    email: z.string().email().max(320),
    role: z.enum(["user", "bot"]),
    text: z.string().min(1).max(4000),
    timestamp: z.coerce.number().int().min(0),
  })
  .strict();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous"
  );
}

function isInternalAuthorized(req: NextRequest): boolean {
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected) return false;
  const provided = req.headers.get("x-internal-api-key") || "";
  return provided.length > 0 && provided === expected;
}

export const POST = createApiHandler(
  async (ctx, body: z.infer<typeof bodySchema>) => {
    const internalOk = isInternalAuthorized(ctx.request);
    const user = ctx.user;

    if (!user && !internalOk) {
      return errorResponse("Unauthorized", 401, {
        correlationId: ctx.correlationId,
        code: ErrorCode.UNAUTHORIZED,
      });
    }

    // Basic anti-spam shaping: if authenticated, pin the email to the account.
    const email = user?.email ? user.email : body.email;

    await db.collection("chatbotMessages").add({
      email,
      role: body.role,
      text: body.text,
      timestamp: body.timestamp,
      createdAt: Date.now(),
      userId: user?.id || null,
      source: internalOk && !user ? "internal" : "user",
      ip: user ? null : getClientIp(ctx.request),
    });

    return successResponse({ ok: true }, 200, ctx.correlationId);
  },
  {
    bodySchema,
    requireAuth: false,
    rateLimit: {
      identifier: "save_chatbot_message",
      maxRequests: 60,
      windowMs: 60_000,
    },
  }
);
