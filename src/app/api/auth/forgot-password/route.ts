import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { sendForgotPasswordEmail } from "@/lib/auth/email";

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
      // Generate Firebase reset link to obtain the secure oobCode
      const link = await adminAuth
        .generatePasswordResetLink(email)
        .catch((e: any) => {
          if (e?.code === "auth/user-not-found") return null; // continue with generic OK
          throw e;
        });

      if (!link) {
        // Do not reveal non-existence of user
        return NextResponse.json({
          ok: true,
          message: "If an account exists, a reset link was sent",
        });
      }

      // Build custom reset URL pointing to our page with the oobCode
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_BASE_URL || new URL(request.url).origin;
      let oobCode = "";
      try {
        const u = new URL(link);
        oobCode = u.searchParams.get("oobCode") || "";
      } catch {}

      const resetUrl = oobCode
        ? `${baseUrl}/reset-password?oobCode=${encodeURIComponent(
            oobCode
          )}&email=${encodeURIComponent(email)}`
        : `${baseUrl}/reset-password`;

      // Send via Resend using our template
      await sendForgotPasswordEmail(email, resetUrl).catch(() => null);

      return NextResponse.json({
        ok: true,
        message: "If an account exists, a reset link was sent",
      });
    } catch (err: any) {
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
