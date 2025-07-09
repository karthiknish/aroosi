import { NextRequest } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@convex/_generated/api';
import { JWTUtils, SessionTokenPayload } from './jwt';
import { apiResponse } from './apiResponse';

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
  emailVerified?: boolean;
  sessionId: string;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}

export interface AuthError {
  errorResponse: Response;
}

/**
 * Authentication utilities for API routes
 */
export class AuthUtils {
  /**
   * Require authentication for API routes
   * @param request - Next.js request object
   * @returns Promise<AuthResult | AuthError>
   */
  static async requireAuth(request: NextRequest): Promise<AuthResult | AuthError> {
    try {
      // Get session token from cookie
      const sessionToken = request.cookies.get('session')?.value;
      
      if (!sessionToken) {
        return {
          errorResponse: new Response(
            JSON.stringify(apiResponse.error('No session token found', 401)),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          ),
        };
      }

      // Verify token
      const payload = JWTUtils.verifySessionToken(sessionToken);
      if (!payload) {
        return {
          errorResponse: new Response(
            JSON.stringify(apiResponse.error('Invalid session token', 401)),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          ),
        };
      }

      // Check if session exists in database
      const session = await client.query(api.auth.getSession, {
        sessionId: payload.sessionId,
      });

      if (!session) {
        return {
          errorResponse: new Response(
            JSON.stringify(apiResponse.error('Session not found', 401)),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          ),
        };
      }

      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        return {
          errorResponse: new Response(
            JSON.stringify(apiResponse.error('Session expired', 401)),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          ),
        };
      }

      // Get user data
      const user = await client.query(api.auth.getUserById, {
        userId: payload.userId,
      });

      if (!user) {
        return {
          errorResponse: new Response(
            JSON.stringify(apiResponse.error('User not found', 401)),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          ),
        };
      }

      // Check if user is banned
      if (user.banned) {
        return {
          errorResponse: new Response(
            JSON.stringify(apiResponse.error('Account has been banned', 403)),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          ),
        };
      }

      // Update session activity
      await client.mutation(api.auth.updateSessionActivity, {
        sessionId: payload.sessionId,
      });

      return {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          sessionId: payload.sessionId,
        },
        token: sessionToken,
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        errorResponse: new Response(
          JSON.stringify(apiResponse.error('Authentication failed', 500)),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }
  }

  /**
   * Require admin authentication for API routes
   * @param request - Next.js request object
   * @returns Promise<AuthResult | AuthError>
   */
  static async requireAdminAuth(request: NextRequest): Promise<AuthResult | AuthError> {
    const authResult = await this.requireAuth(request);
    
    if ('errorResponse' in authResult) {
      return authResult;
    }

    // Check if user has admin role
    if (authResult.user.role !== 'admin') {
      return {
        errorResponse: new Response(
          JSON.stringify(apiResponse.error('Admin access required', 403)),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }

    return authResult;
  }

  /**
   * Get current user without requiring authentication (optional auth)
   * @param request - Next.js request object
   * @returns Promise<AuthUser | null>
   */
  static async getCurrentUser(request: NextRequest): Promise<AuthUser | null> {
    try {
      const authResult = await this.requireAuth(request);
      
      if ('errorResponse' in authResult) {
        return null;
      }

      return authResult.user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Extract user ID from request
   * @param request - Next.js request object
   * @returns Promise<string | null>
   */
  static async getUserId(request: NextRequest): Promise<string | null> {
    const user = await this.getCurrentUser(request);
    return user?.id || null;
  }

  /**
   * Check if user is admin
   * @param request - Next.js request object
   * @returns Promise<boolean>
   */
  static async isAdmin(request: NextRequest): Promise<boolean> {
    const user = await this.getCurrentUser(request);
    return user?.role === 'admin';
  }

  /**
   * Validate Bearer token from Authorization header
   * @param request - Next.js request object
   * @returns Promise<AuthResult | AuthError>
   */
  static async validateBearerToken(request: NextRequest): Promise<AuthResult | AuthError> {
    try {
      const authHeader = request.headers.get('authorization');
      const token = JWTUtils.extractTokenFromHeader(authHeader || '');
      
      if (!token) {
        return {
          errorResponse: new Response(
            JSON.stringify(apiResponse.error('No authorization token provided', 401)),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          ),
        };
      }

      // Verify token
      const payload = JWTUtils.verifySessionToken(token);
      if (!payload) {
        return {
          errorResponse: new Response(
            JSON.stringify(apiResponse.error('Invalid authorization token', 401)),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          ),
        };
      }

      // Check if session exists in database
      const session = await client.query(api.auth.getSession, {
        sessionId: payload.sessionId,
      });

      if (!session) {
        return {
          errorResponse: new Response(
            JSON.stringify(apiResponse.error('Session not found', 401)),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          ),
        };
      }

      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        return {
          errorResponse: new Response(
            JSON.stringify(apiResponse.error('Session expired', 401)),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          ),
        };
      }

      // Get user data
      const user = await client.query(api.auth.getUserById, {
        userId: payload.userId,
      });

      if (!user) {
        return {
          errorResponse: new Response(
            JSON.stringify(apiResponse.error('User not found', 401)),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          ),
        };
      }

      // Check if user is banned
      if (user.banned) {
        return {
          errorResponse: new Response(
            JSON.stringify(apiResponse.error('Account has been banned', 403)),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          ),
        };
      }

      return {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          sessionId: payload.sessionId,
        },
        token,
      };
    } catch (error) {
      console.error('Bearer token validation error:', error);
      return {
        errorResponse: new Response(
          JSON.stringify(apiResponse.error('Token validation failed', 500)),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        ),
      };
    }
  }

  /**
   * Rate limiting helper
   * @param request - Next.js request object
   * @param key - Rate limit key (e.g., IP address or user ID)
   * @param limit - Number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Promise<boolean> - Whether request is allowed
   */
  static async checkRateLimit(
    request: NextRequest,
    key: string,
    limit: number,
    windowMs: number
  ): Promise<boolean> {
    try {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old rate limit entries
      // This is a simplified implementation - you might want to use Redis or similar for production
      
      // For now, we'll implement a basic rate limiting logic
      // In production, you'd want to use a proper rate limiting service
      
      return true; // Placeholder - implement proper rate limiting
    } catch (error) {
      console.error('Rate limit check error:', error);
      return false;
    }
  }
}

// Legacy compatibility functions (to match existing Clerk implementation)
export const requireUserToken = AuthUtils.requireAuth;
export const requireAdminToken = AuthUtils.requireAdminAuth;