import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { sendForgotPasswordEmail } from "@/lib/auth/email";

/**
 * Send password reset email using Firebase
 * This endpoint now uses the same email template as forgot-password for consistency
 */
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
          if (e?.code === "auth/user-not-found") return null;
          throw e;
        });

      if (!link) {
        // Do not reveal non-existence of user
        return NextResponse.json({
          ok: true,
          message: "If an account exists with this email, a password reset link has been sent",
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
        ? `${baseUrl}/reset-password?oobCode=${encodeURIComponent(oobCode)}&email=${encodeURIComponent(email)}`
        : `${baseUrl}/reset-password`;

      // Send via Resend using our template (consistent with forgot-password)
      await sendForgotPasswordEmail(email, resetUrl).catch(() => null);

      return NextResponse.json(
        {
          ok: true,
          message: "Password reset email sent successfully",
        },
        { status: 200 }
      );
    } catch (firebaseError: any) {
      console.error("Firebase password reset error:", firebaseError);
      return NextResponse.json(
        { error: "Failed to send password reset email", code: "UNKNOWN" },
        { status: 500 }
      );
    }
  } catch (e) {
    console.error("Unexpected error in password reset route:", e);
    return NextResponse.json(
      { error: "Password reset failed", code: "UNKNOWN" },
      { status: 500 }
    );
  }
}
