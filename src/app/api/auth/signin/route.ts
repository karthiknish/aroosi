import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { PasswordUtils } from '@/lib/utils/password';
import { JWTUtils } from '@/lib/utils/jwt';
import { apiResponse } from '@/lib/utils/apiResponse';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        apiResponse.error('Email and password are required', 400),
        { status: 400 }
      );
    }

    // Get user by email
    const user = await client.query(api.auth.getUserByEmail, { email });
    if (!user) {
      return NextResponse.json(
        apiResponse.error('Invalid email or password', 401),
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const lockedUntil = new Date(user.lockedUntil).toLocaleString();
      return NextResponse.json(
        apiResponse.error(`Account is locked until ${lockedUntil}`, 423),
        { status: 423 }
      );
    }

    // Check if account is banned
    if (user.banned) {
      return NextResponse.json(
        apiResponse.error('Account has been banned', 403),
        { status: 403 }
      );
    }

    // Verify password
    const passwordMatch = await PasswordUtils.verify(password, user.passwordHash);
    if (!passwordMatch) {
      // Increment login attempts
      await client.mutation(api.auth.incrementLoginAttempts, { userId: user._id });
      
      return NextResponse.json(
        apiResponse.error('Invalid email or password', 401),
        { status: 401 }
      );
    }

    // Check if email is verified (optional - you can skip this for now)
    // if (!user.emailVerified) {
    //   return NextResponse.json(
    //     apiResponse.error('Please verify your email before signing in', 401),
    //     { status: 401 }
    //   );
    // }

    // Reset login attempts and update last login
    await client.mutation(api.auth.resetLoginAttempts, { userId: user._id });

    // Create session
    const sessionId = await client.mutation(api.auth.createSession, {
      userId: user._id,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
    });

    // Generate tokens
    const sessionToken = JWTUtils.generateSessionToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      sessionId,
      type: 'session',
    });

    // Set HTTP-only cookie
    const response = NextResponse.json(
      apiResponse.success(
        {
          user: {
            id: user._id,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
          },
          sessionId,
        },
        'Signed in successfully'
      ),
      { status: 200 }
    );

    // Set session cookie
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json(
      apiResponse.error('Internal server error', 500),
      { status: 500 }
    );
  }
}