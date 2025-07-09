import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { JWTUtils } from '@/lib/utils/jwt';
import { apiResponse } from '@/lib/utils/apiResponse';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('session')?.value;
    
    if (sessionToken) {
      // Verify and decode token
      const payload = JWTUtils.verifySessionToken(sessionToken);
      
      if (payload) {
        // Delete session from database
        await client.mutation(api.auth.deleteSession, {
          sessionId: payload.sessionId,
        });
      }
    }

    // Create response
    const response = NextResponse.json(
      apiResponse.success(null, 'Signed out successfully'),
      { status: 200 }
    );

    // Clear session cookie
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signout error:', error);
    
    // Still clear the cookie even if there's an error
    const response = NextResponse.json(
      apiResponse.success(null, 'Signed out successfully'),
      { status: 200 }
    );

    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  }
}