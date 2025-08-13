import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code, signUpAttemptId } = body;

    // Validate input
    if (!email || !code || !signUpAttemptId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Attempt to complete the sign up with the verification code
    const clerk = await clerkClient();
    // @ts-expect-error - signUp is not in the type definitions but exists in the API
    const signUp = await clerk.signUp.attemptEmailAddressVerification({
      code,
      signUpId: signUpAttemptId,
    });

    if (signUp.status !== "complete") {
      return NextResponse.json(
        { success: false, error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Sign up is complete, create the response
    return NextResponse.json({
      success: true,
      userId: signUp.userId,
    });
  } catch (error: any) {
    console.error("OTP verification error:", error);
    
    // Handle specific Clerk errors
    if (error?.errors) {
      const clerkError = error.errors[0];
      if (clerkError.code === "verification_failed") {
        return NextResponse.json(
          { success: false, error: "Invalid verification code" },
          { status: 400 }
        );
      }
      if (clerkError.code === "verification_expired") {
        return NextResponse.json(
          { success: false, error: "Verification code has expired. Please request a new one." },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: "Failed to verify code. Please try again." },
      { status: 500 }
    );
  }
}