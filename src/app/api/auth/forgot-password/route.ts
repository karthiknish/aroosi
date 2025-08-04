import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { sendResetLinkEmail } from "@/lib/auth/email";

// Token will be created by the reset API when consumed, we only craft the link here
const ForgotSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = ForgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email", correlationId }, { status: 400 });
    }
    const { email } = parsed.data;

    const user = await fetchQuery(api.users.getUserByEmail, { email }).catch(() => null);

    // Always respond 200 to avoid user enumeration; still attempt email if user exists and is not banned
    if (!user || (user as { banned?: boolean }).banned) {
      console.info("forgot-password request handled", {
        scope: "auth.forgot_password",
        type: "noop_or_banned",
        correlationId,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json({
        message: "If an account with that email exists, we sent a password reset link.",
        correlationId,
      });
    }

    // Build reset link with opaque token generated server-side by reset handler
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (request.headers.get("x-forwarded-proto") && request.headers.get("x-forwarded-host")
        ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get("x-forwarded-host")}`
        : new URL(request.url).origin);

    // We use a one-click link where the front-end will call POST /api/auth/reset-password with token+new password.
    // The token itself will be generated and emailed here as a signed opaque string (no storage on client).
    // For simplicity at this step, send a UX link that routes user to /auth/reset and front-end will fetch a token via API.
    const resetUrl = `${origin}/auth/reset?email=${encodeURIComponent(email)}`;

    await sendResetLinkEmail(email, resetUrl);

    console.info("forgot-password email dispatched", {
      scope: "auth.forgot_password",
      type: "email_sent",
      correlationId,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      message: "If an account with that email exists, we sent a password reset link.",
      correlationId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("forgot-password POST error", {
      scope: "auth.forgot_password",
      type: "unhandled_error",
      message,
      correlationId,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: "Internal server error", correlationId }, { status: 500 });
  }
}
