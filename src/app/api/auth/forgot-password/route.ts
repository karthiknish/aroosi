import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { JWTUtils } from '@/lib/utils/jwt';
import { apiResponse } from '@/lib/utils/apiResponse';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        apiResponse.error('Email is required', 400),
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        apiResponse.error('Invalid email format', 400),
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await client.query(api.auth.getUserByEmail, { email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        apiResponse.success(
          null,
          'If an account with this email exists, you will receive a password reset link.'
        ),
        { status: 200 }
      );
    }

    // Generate password reset token
    const resetToken = JWTUtils.generateVerificationToken({
      userId: user._id,
      email: user.email,
      type: 'password_reset',
    });

    // Store reset token in database
    await client.mutation(api.auth.createVerificationToken, {
      userId: user._id,
      token: resetToken,
      type: 'password_reset',
    });

    // TODO: Send password reset email
    // await EmailService.sendPasswordResetEmail(email, resetToken);

    return NextResponse.json(
      apiResponse.success(
        null,
        'If an account with this email exists, you will receive a password reset link.'
      ),
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      apiResponse.error('Internal server error', 500),
      { status: 500 }
    );
  }
}