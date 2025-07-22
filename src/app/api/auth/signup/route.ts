import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { generateOTP, storeOTP } from "@/lib/auth/otp";
import { sendOTPEmail } from "@/lib/auth/email";
import { storeTempUser } from "@/lib/auth/tempStorage";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

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

    // Check if user already exists
    try {
      const existingUser = await fetchQuery(api.auth.getUserByEmail, { email });
      if (existingUser) {
        return NextResponse.json(
          {
            error: "An account with this email already exists",
            code: "EMAIL_EXISTS",
            suggestion: "Please sign in or use a different email address",
          },
          { status: 409 }
        );
      }
    } catch (error) {
      console.error("Error checking for existing user:", error);
      // Continue with signup if we can't verify - will be caught in verify-otp
    }

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
        { status: 500 }
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
