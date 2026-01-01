import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { sendForgotPasswordEmail } from "@/lib/auth/email";
import { successResponse, errorResponse } from "@/lib/api/handler";

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
      return errorResponse("Missing email", 400, { code: "BAD_REQUEST" });
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
        return successResponse({
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

      return successResponse({
        ok: true,
        message: "Password reset email sent successfully",
      });
    } catch (firebaseError: any) {
      console.error("Firebase password reset error:", firebaseError);
      return errorResponse("Failed to send password reset email", 500, { code: "UNKNOWN" });
    }
  } catch (e) {
    console.error("Unexpected error in password reset route:", e);
    return errorResponse("Password reset failed", 500, { code: "UNKNOWN" });
  }
}
