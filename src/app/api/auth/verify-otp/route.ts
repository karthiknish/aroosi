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
    console.log("Verify OTP request received:", {
      email: body.email,
      hasOtp: !!body.otp,
    });
    const { email, otp } = verifyOtpSchema.parse(body);

    // Verify OTP
    console.log("Verifying OTP for email:", email);
    const isValidOTP = verifyOTP(email, otp);
    if (!isValidOTP) {
      console.error("Invalid or expired OTP provided for email:", email);
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 },
      );
    }
    console.log("OTP verified successfully for email:", email);

    // Get temporary user data
    console.log("Retrieving temporary user data for email:", email);
    const tempUser = getTempUser(email);
    if (!tempUser) {
      console.error("No temporary user data found for email:", email);
      return NextResponse.json(
        { error: "Registration session expired. Please sign up again." },
        { status: 400 },
      );
    }
    console.log("Temporary user data retrieved successfully for email:", email);

    try {
      console.log("Creating user in Convex for email:", email);
      // Create user in Convex
      const userId = await fetchMutation(api.auth.createUser, {
        email: tempUser.email,
        hashedPassword: tempUser.hashedPassword,
        firstName: tempUser.firstName,
        lastName: tempUser.lastName,
      });

      console.log("User created successfully with ID:", userId);
      // Clean up temporary data
      deleteTempUser(email);
      console.log("Temporary user data deleted for email:", email);

      console.log("Generating JWT token for user:", userId);
      // Generate JWT token
      const token = await signJWT({
        userId: userId.toString(),
        email: tempUser.email,
        role: "user",
      });

      console.log("Sending welcome email to:", tempUser.email);
      // Send welcome email
      await sendWelcomeEmail(
        tempUser.email,
        `${tempUser.firstName} ${tempUser.lastName}`,
      );
      console.log("Welcome email sent successfully to:", tempUser.email);

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
      console.error(
        "User creation failed for email:",
        email,
        "Error:",
        convexError
      );
      // Clean up temporary data even if user creation fails
      deleteTempUser(email);
      console.log(
        "Temporary user data deleted after failed creation for email:",
        email
      );

      if (
        convexError instanceof Error &&
        convexError.message?.includes("already exists")
      ) {
        console.warn("User already exists for email:", email);
        return NextResponse.json(
          { error: "User already exists" },
          { status: 400 },
        );
      }

      console.error(
        "Failed to create account for email:",
        email,
        "Error:",
        convexError
      );
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Unexpected error in verify-otp endpoint:", error);
    if (error instanceof z.ZodError) {
      console.warn(
        "Validation error for request:",
        body,
        "Errors:",
        error.errors
      );
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
