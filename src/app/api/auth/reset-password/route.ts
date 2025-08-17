import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

// Send password reset email using Firebase
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
      // Send password reset email
      await adminAuth.generatePasswordResetLink(email);

      return NextResponse.json(
        {
          ok: true,
          message: "Password reset email sent successfully",
        },
        { status: 200 }
      );
    } catch (firebaseError: any) {
      console.error("Firebase password reset error:", firebaseError);

      if (firebaseError.code === "auth/user-not-found") {
        // For security reasons, we don't reveal if the user exists
        return NextResponse.json(
          {
            ok: true,
            message:
              "If an account exists with this email, a password reset link has been sent",
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { error: "Failed to send password reset email", code: "UNKNOWN" },
          { status: 500 }
        );
      }
    }
  } catch (e) {
    console.error("Unexpected error in password reset route:", e);
    return NextResponse.json(
      { error: "Password reset failed", code: "UNKNOWN" },
      { status: 500 }
    );
  }
}
