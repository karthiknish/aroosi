import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { generateOTP, storeOTP } from "@/lib/auth/otp";
import { sendOTPEmail } from "@/lib/auth/email";
import { storeTempUser } from "@/lib/auth/tempStorage";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName } = signupSchema.parse(body);

    // For now, we'll skip the user existence check since Convex has errors
    // We'll handle this in the verify-otp endpoint when creating the user

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate and store OTP
    const otp = generateOTP();
    storeOTP(email, otp);

    // Store user data temporarily until OTP verification
    storeTempUser(email, hashedPassword, firstName, lastName);

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp);
    if (!emailSent) {
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Verification code sent to your email",
      email,
    });
  } catch (error) {
    console.error("Signup error:", error);
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
