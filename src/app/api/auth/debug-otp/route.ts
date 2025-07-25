import { NextRequest, NextResponse } from "next/server";
import { getOTPStatus, getAllOTPs } from "@/lib/auth/otp";
import { getTempUser } from "@/lib/auth/tempStorage";

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 404 }
    );
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const otpStatus = getOTPStatus(email);
    const tempUser = getTempUser(email);
    const allOTPs = getAllOTPs();

    return NextResponse.json({
      email: email,
      normalizedEmail: email.toLowerCase().trim(),
      otp: {
        ...otpStatus,
        timeRemainingMinutes: otpStatus.timeRemaining
          ? Math.floor(otpStatus.timeRemaining / 60)
          : 0,
      },
      tempUser: tempUser
        ? {
            exists: true,
            email: tempUser.email,
            firstName: tempUser.firstName,
            lastName: tempUser.lastName,
            expiresAt: new Date(tempUser.expiresAt).toISOString(),
          }
        : {
            exists: false,
          },
      allOTPs: allOTPs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Debug OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check all OTPs without needing email
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 404 }
    );
  }

  try {
    const allOTPs = getAllOTPs();

    return NextResponse.json({
      totalOTPs: allOTPs.length,
      otps: allOTPs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Debug OTP GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
