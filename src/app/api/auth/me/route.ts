import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { JWTUtils } from '@/lib/utils/jwt';
import { apiResponse } from '@/lib/utils/apiResponse';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        apiResponse.error('No session token found', 401),
        { status: 401 }
      );
    }

    // Verify token
    const payload = JWTUtils.verifySessionToken(sessionToken);
    if (!payload) {
      return NextResponse.json(
        apiResponse.error('Invalid session token', 401),
        { status: 401 }
      );
    }

    // Check if session exists in database
    const session = await client.query(api.auth.getSession, {
      sessionId: payload.sessionId,
    });

    if (!session) {
      return NextResponse.json(
        apiResponse.error('Session not found', 401),
        { status: 401 }
      );
    }

    // Get user data
    const user = await client.query(api.auth.getUserById, {
      userId: payload.userId,
    });

    if (!user) {
      return NextResponse.json(
        apiResponse.error('User not found', 401),
        { status: 401 }
      );
    }

    // Update session last activity
    await client.mutation(api.auth.updateSessionActivity, {
      sessionId: payload.sessionId,
    });

    // Get user profile
    const profile = await client.query(api.profiles.getProfileByUserId, {
      userId: payload.userId,
    });

    return NextResponse.json(
      apiResponse.success({
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
        profile: profile ? {
          id: profile._id,
          fullName: profile.fullName,
          isProfileComplete: profile.isProfileComplete,
          isOnboardingComplete: profile.isOnboardingComplete,
        } : null,
        session: {
          id: session._id,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      apiResponse.error('Internal server error', 500),
      { status: 500 }
    );
  }
}