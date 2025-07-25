import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateOTP, storeOTP } from "@/lib/auth/otp";
import { sendOTPEmail } from "@/lib/auth/email";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Check if user exists
    const user = await fetchQuery(api.users.getUserByEmail, { email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message:
          "If an account with that email exists, we sent a password reset code.",
      });
    }

    if (user.banned) {
      return NextResponse.json({ error: "Account is banned" }, { status: 403 });
    }

    // Generate and store OTP for password reset
    const otp = generateOTP();
    storeOTP(`reset_${email}`, otp); // Prefix with 'reset_' to distinguish from signup OTPs

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(email, otp);
    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send password reset email" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message:
        "If an account with that email exists, we sent a password reset code.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function sendPasswordResetEmail(
  email: string,
  otp: string,
): Promise<boolean> {
  try {
    // You can use the same email service but with different template
    // For now, using the same OTP email function
    return await sendOTPEmail(email, otp);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return false;
  }
}
