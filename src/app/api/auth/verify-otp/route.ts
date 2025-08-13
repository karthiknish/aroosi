import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
// Assuming you have a way to store and retrieve OTP codes
// This could be a database, Redis, or any other storage solution
import { getStoredOTP, deleteStoredOTP } from "@/lib/utils/otpStorage";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, signUpAttemptId } = body;

    // Validate input
    if (!email || !code || !signUpAttemptId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the OTP code against the one stored in our database
    const storedOTP = await getStoredOTP(email);
    
    if (!storedOTP) {
      return NextResponse.json(
        { success: false, error: "OTP code has expired. Please request a new one." },
        { status: 400 }
      );
    }
    
    if (storedOTP.code !== code) {
      return NextResponse.json(
        { success: false, error: "Invalid verification code" },
        { status: 400 }
      );
    }
    
    // Check if OTP has expired (assuming 10 minutes expiry)
    const now = Date.now();
    if (now > storedOTP.expiresAt) {
      // Delete expired OTP
      await deleteStoredOTP(email);
      return NextResponse.json(
        { success: false, error: "OTP code has expired. Please request a new one." },
        { status: 400 }
      );
    }
    
    // OTP is valid, now use Clerk to complete the sign up
    try {
      // Delete the OTP as it's been used
      await deleteStoredOTP(email);
      
      // Attempt to complete the sign up with Clerk
      const clerk = await clerkClient();
      // @ts-expect-error - signUp is not in the type definitions but exists in the API
      const signUp = await clerk.signUp.attemptEmailAddressVerification({
        code, // This can be any valid code since we've already verified it
        signUpId: signUpAttemptId,
      });

      if (signUp.status !== "complete") {
        return NextResponse.json(
          { success: false, error: "Failed to complete sign up" },
          { status: 400 }
        );
      }

      // Sign up is complete, create the response
      return NextResponse.json({
        success: true,
        userId: signUp.userId,
      });
    } catch (error: any) {
      console.error("Clerk sign up completion error:", error);
      
      // Handle specific Clerk errors
      if (error?.errors) {
        const clerkError = error.errors[0];
        if (clerkError.code === "verification_failed") {
          return NextResponse.json(
            { success: false, error: "Failed to complete sign up" },
            { status: 400 }
          );
        }
        if (clerkError.code === "verification_expired") {
          return NextResponse.json(
            { success: false, error: "Sign up session has expired. Please start over." },
            { status: 400 }
          );
        }
      }
      
      return NextResponse.json(
        { success: false, error: "Failed to complete sign up. Please try again." },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Unexpected error in OTP verification:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}