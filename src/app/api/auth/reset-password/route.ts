import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { verifyOTP } from "@/lib/auth/otp";
import { signAccessJWT } from "@/lib/auth/jwt";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, newPassword } = resetPasswordSchema.parse(body);

    // Verify OTP with reset prefix
    const isValidOTP = verifyOTP(`reset_${email}`, otp);
    if (!isValidOTP) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 },
      );
    }

    // Get user by email
    const user = await fetchQuery(api.users.getUserByEmail, { email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.banned) {
      return NextResponse.json({ error: "Account is banned" }, { status: 403 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await fetchMutation(api.auth.updatePassword, {
      userId: user._id,
      hashedPassword,
    });

    // Generate new JWT access token (consistent with available exports)
    const token = await signAccessJWT({
      userId: user._id.toString(),
      email: user.email,
      role: user.role || "user",
    });

    return NextResponse.json({
      message: "Password reset successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Reset password error:", error);
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
