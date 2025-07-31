import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendWelcomeEmail } from "@/lib/auth/email";

const EMAILS_ENABLED =
  process.env.EMAILS_ENABLED === "true" || process.env.NODE_ENV === "production";

/**
 * POST /api/email/welcome
 * Body: { email: string, name: string }
 * Sends the "Welcome to Aroosi" email using Resend via sendWelcomeEmail.
 * This endpoint is intended to be called server-side immediately after a successful signup.
 */
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    if (!EMAILS_ENABLED) {
      return NextResponse.json(
        { success: false, error: "Emails are disabled by configuration" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { email, name } = schema.parse(body);

    const ok = await sendWelcomeEmail(email, name);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Failed to send welcome email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid payload", details: err.errors },
        { status: 400 }
      );
    }
    console.error("Welcome email error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}