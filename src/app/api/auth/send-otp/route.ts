import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { generateOTP } from "@/lib/utils/otp";
import { storeOTP } from "@/lib/utils/otpStorage";
import { OtpEmailTemplate } from '@/components/emails/OtpEmailTemplate';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Generate a 6-digit OTP
    const otp = generateOTP();

    // Store the OTP with a 10-minute expiration
    await storeOTP(email, otp, 10 * 60 * 1000); // 10 minutes

    // Send the email using Resend with a template
    const { data, error } = await resend.emails.send({
      from: "Aroosi <verify@aroosi.app>", // Replace with your verified domain
      to: [email],
      subject: "Your Aroosi Verification Code",
      react: OtpEmailTemplate({ 
        firstName: email.split("@")[0], 
        verificationCode: otp 
      }),
    });

    if (error) {
      console.error("Failed to send OTP email:", error);
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
    });
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}