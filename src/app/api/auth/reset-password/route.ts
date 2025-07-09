import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { PasswordUtils } from '@/lib/utils/password';
import { JWTUtils } from '@/lib/utils/jwt';
import { apiResponse } from '@/lib/utils/apiResponse';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        apiResponse.error('Reset token and new password are required', 400),
        { status: 400 }
      );
    }

    // Verify token
    const payload = JWTUtils.verifyVerificationToken(token);
    if (!payload || payload.type !== 'password_reset') {
      return NextResponse.json(
        apiResponse.error('Invalid or expired reset token', 400),
        { status: 400 }
      );
    }

    // Check if reset token exists in database
    const resetToken = await client.query(api.auth.getVerificationToken, {
      token,
    });

    if (!resetToken || resetToken.usedAt) {
      return NextResponse.json(
        apiResponse.error('Invalid or already used reset token', 400),
        { status: 400 }
      );
    }

    // Validate new password
    const passwordValidation = PasswordUtils.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        apiResponse.validationError({ password: passwordValidation.errors }),
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await PasswordUtils.hash(newPassword);

    // Update user password
    await client.mutation(api.auth.updatePassword, {
      userId: payload.userId,
      passwordHash,
    });

    // Mark token as used
    await client.mutation(api.auth.useVerificationToken, {
      tokenId: resetToken._id,
    });

    // Invalidate all user sessions for security
    await client.mutation(api.auth.invalidateAllUserSessions, {
      userId: payload.userId,
    });

    return NextResponse.json(
      apiResponse.success(null, 'Password reset successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      apiResponse.error('Internal server error', 500),
      { status: 500 }
    );
  }
}