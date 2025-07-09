import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { JWTUtils } from '@/lib/utils/jwt';
import { apiResponse } from '@/lib/utils/apiResponse';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        apiResponse.error('Verification token is required', 400),
        { status: 400 }
      );
    }

    // Verify token
    const payload = JWTUtils.verifyVerificationToken(token);
    if (!payload || payload.type !== 'email_verification') {
      return NextResponse.json(
        apiResponse.error('Invalid or expired verification token', 400),
        { status: 400 }
      );
    }

    // Check if verification token exists in database
    const verificationToken = await client.query(api.auth.getVerificationToken, {
      token,
    });

    if (!verificationToken || verificationToken.usedAt) {
      return NextResponse.json(
        apiResponse.error('Invalid or already used verification token', 400),
        { status: 400 }
      );
    }

    // Mark email as verified
    await client.mutation(api.auth.verifyEmail, {
      userId: payload.userId,
    });

    // Mark token as used
    await client.mutation(api.auth.useVerificationToken, {
      tokenId: verificationToken._id,
    });

    return NextResponse.json(
      apiResponse.success(null, 'Email verified successfully'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      apiResponse.error('Internal server error', 500),
      { status: 500 }
    );
  }
}