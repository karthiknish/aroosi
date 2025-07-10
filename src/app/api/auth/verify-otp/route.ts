import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOTP } from "@/lib/auth/otp";
import { getTempUser, deleteTempUser } from "@/lib/auth/tempStorage";
import { signJWT } from "@/lib/auth/jwt";
import { sendWelcomeEmail } from "@/lib/auth/email";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = verifyOtpSchema.parse(body);

    // Verify OTP
    const isValidOTP = verifyOTP(email, otp);
    if (!isValidOTP) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 },
      );
    }

    // Get temporary user data
    const tempUser = getTempUser(email);
    if (!tempUser) {
      return NextResponse.json(
        { error: "Registration session expired. Please sign up again." },
        { status: 400 },
      );
    }

    try {
      // Create user in Convex
      const userId = await fetchMutation(api.auth.createUser, {
        email: tempUser.email,
        hashedPassword: tempUser.hashedPassword,
        firstName: tempUser.firstName,
        lastName: tempUser.lastName,
      });

      // Clean up temporary data
      deleteTempUser(email);

      // Generate JWT token
      const token = await signJWT({
        userId: userId.toString(),
        email: tempUser.email,
        role: "user",
      });

      // Send welcome email
      await sendWelcomeEmail(
        tempUser.email,
        `${tempUser.firstName} ${tempUser.lastName}`,
      );

      return NextResponse.json({
        message: "Account created successfully",
        token,
        user: {
          id: userId,
          email: tempUser.email,
          name: `${tempUser.firstName} ${tempUser.lastName}`,
        },
      });
    } catch (convexError: unknown) {
      // Clean up temporary data even if user creation fails
      deleteTempUser(email);

      if (
        convexError instanceof Error &&
        convexError.message?.includes("already exists")
      ) {
        return NextResponse.json(
          { error: "User already exists" },
          { status: 400 },
        );
      }

      console.error("User creation error:", convexError);
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Verify OTP error:", error);
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
