import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

// Alias endpoint for requesting password reset emails
export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json().catch(() => ({}))) as {
      email?: string;
    };
    if (!email) {
      return NextResponse.json(
        { error: "Missing email", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }
    try {
      await adminAuth.generatePasswordResetLink(email);
      return NextResponse.json({
        ok: true,
        message: "If an account exists, a reset link was sent",
      });
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") {
        return NextResponse.json({
          ok: true,
          message: "If an account exists, a reset link was sent",
        });
      }
      console.error("forgot-password error", err);
      return NextResponse.json(
        { error: "Failed to process request" },
        { status: 500 }
      );
    }
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
