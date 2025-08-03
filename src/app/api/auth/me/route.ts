import { NextRequest, NextResponse } from "next/server";
import { verifyAccessJWT, extractTokenFromHeader } from "@/lib/auth/jwt";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * /api/auth/me
 * Adds structured logging and correlationId. Provides precise 4xx reasons and forwards refreshed cookies.
 * Also initializes a Convex client with the verified user to avoid NoAuthProvider in server-side queries.
 */
export async function GET(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    const authHeader = request.headers.get("authorization");
    const bearerToken = extractTokenFromHeader(authHeader);
    const cookieToken = request.cookies.get("auth-token")?.value;

    // Prefer Authorization header, then cookie
    const tokenToVerify = bearerToken || cookieToken || null;

    if (!tokenToVerify) {
      console.warn("Auth/me missing token", {
        scope: "auth.me",
        correlationId,
        type: "no_session",
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "No auth session", correlationId },
        { status: 401 }
      );
    }

    // We may need to forward refreshed cookies back to the client
    let refreshedSetCookies: string[] = [];

    // Verify access token; if expired/invalid, attempt transparent refresh using refresh-token
    let userIdFromSession: string | null = null;
    let effectiveAccessToken: string | null = null;

    try {
      const payload = await verifyAccessJWT(tokenToVerify);
      userIdFromSession = payload.userId;
      effectiveAccessToken = tokenToVerify;
    } catch (e) {
      // Attempt refresh only if refresh-token exists
      const refreshCookie = request.cookies.get("refresh-token")?.value;
      if (!refreshCookie) {
        console.warn("Auth/me invalid token and no refresh cookie", {
          scope: "auth.me",
          correlationId,
          type: "expired_no_refresh",
          message: e instanceof Error ? e.message : String(e),
          statusCode: 401,
          durationMs: Date.now() - startedAt,
        });
        return NextResponse.json(
          { error: "Invalid or expired session", correlationId },
          { status: 401 }
        );
      }

      try {
        // Proxy a server-side refresh call using cookie-based auth
        const refreshUrl = new URL("/api/auth/refresh", request.url);
        const refreshResp = await fetch(refreshUrl.toString(), {
          method: "POST",
          headers: {
            cookie: request.headers.get("cookie") || "",
            accept: "application/json",
          },
          redirect: "manual",
        });

        if (!refreshResp.ok) {
          const text = await refreshResp.text().catch(() => "");
          console.warn("Auth/me refresh failed", {
            scope: "auth.me",
            correlationId,
            type: "refresh_failed",
            status: refreshResp.status,
            bodyPreview: text.slice(0, 200),
            statusCode: 401,
            durationMs: Date.now() - startedAt,
          });
          return NextResponse.json(
            { error: "Invalid or expired session", correlationId },
            { status: 401 }
          );
        }

        // Extract new auth-token from Set-Cookie for immediate verification
        const setCookieHeader = refreshResp.headers.get("set-cookie") || "";
        // Split combined Set-Cookie into individual cookie strings
        const cookies = setCookieHeader
          ? setCookieHeader.split(/,(?=[^;]+=[^;]+)/)
          : [];
        let newAccess: string | null = null;
        for (const cookie of cookies) {
          const authMatch = cookie.match(/auth-token=([^;]+)/);
          if (authMatch) {
            newAccess = decodeURIComponent(authMatch[1]);
          }
        }

        if (!newAccess) {
          console.warn("Auth/me missing auth-token after refresh", {
            scope: "auth.me",
            correlationId,
            type: "refresh_missing_token",
            statusCode: 401,
            durationMs: Date.now() - startedAt,
          });
          return NextResponse.json(
            { error: "Invalid or expired session", correlationId },
            { status: 401 }
          );
        }

        const payload = await verifyAccessJWT(newAccess);
        userIdFromSession = payload.userId;
        effectiveAccessToken = newAccess;

        // Save refreshed cookies to append to final response so browser persists them
        refreshedSetCookies = cookies;
      } catch (err) {
        console.error("Auth/me refresh error", {
          scope: "auth.me",
          correlationId,
          type: "refresh_exception",
          message: err instanceof Error ? err.message : String(err),
          statusCode: 401,
          durationMs: Date.now() - startedAt,
        });
        return NextResponse.json(
          { error: "Invalid or expired session", correlationId },
          { status: 401 }
        );
      }
    }

    if (!userIdFromSession) {
      console.warn("Auth/me missing userId after verification", {
        scope: "auth.me",
        correlationId,
        type: "no_user_after_verify",
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "No auth session", correlationId },
        { status: 401 }
      );
    }

    // NOTE: fetchQuery(api.fn, ...) uses a server-side Convex client configured via env.
    // Do not attempt to pass a token here; our getConvexClient() takes no arguments.
    // Keeping this block minimal to avoid NoAuthProvider errors from misconfiguration.
    try {
      const { getConvexClient } = await import("@/lib/convexClient");
      const convex = getConvexClient();
      if (!convex) {
        console.warn("Auth/me convex client not configured", {
          scope: "auth.me",
          correlationId,
          type: "convex_not_configured",
        });
      }
    } catch (e) {
      console.warn("Auth/me convex init warning", {
        scope: "auth.me",
        correlationId,
        type: "convex_init_warning",
        message: e instanceof Error ? e.message : String(e),
      });
    }

    const userIdConvex = userIdFromSession as unknown as Id<"users">;

    // Fetch user by ID directly (avoid email-based lookup)
    const user = await fetchQuery(api.users.getUserById, {
      userId: userIdConvex,
    }).catch((e: unknown) => {
      console.error("Auth/me fetch user error", {
        scope: "auth.me",
        correlationId,
        type: "convex_query_error",
        message: e instanceof Error ? e.message : String(e),
        durationMs: Date.now() - startedAt,
      });
      return null;
    });

    if (!user) {
      console.warn("Auth/me user not found", {
        scope: "auth.me",
        correlationId,
        type: "user_not_found",
        statusCode: 404,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "User not found", correlationId },
        { status: 404 }
      );
    }

    if (user.banned) {
      console.warn("Auth/me banned user access", {
        scope: "auth.me",
        correlationId,
        type: "banned",
        userId: String(user._id),
        statusCode: 403,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Account is banned", correlationId },
        { status: 403 }
      );
    }

    // Attach profile for client-side gating WITHOUT relying on Convex ctx.auth
    const profile = await fetchQuery(api.users.getProfileByUserIdPublic, {
      userId: user._id,
    }).catch((e: unknown) => {
      console.error("Auth/me fetch profile error", {
        scope: "auth.me",
        correlationId,
        type: "convex_query_error",
        message: e instanceof Error ? e.message : String(e),
        durationMs: Date.now() - startedAt,
      });
      return null;
    });

    // Build final response
    const response = NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        profile: profile
          ? {
              id: profile._id,
              isProfileComplete: !!profile.isProfileComplete,
              isOnboardingComplete: !!profile.isOnboardingComplete,
            }
          : null,
      },
      refreshed: refreshedSetCookies.length > 0,
      correlationId,
    });

    // Forward any refreshed cookies so the browser updates its session
    if (refreshedSetCookies.length > 0) {
      for (const c of refreshedSetCookies) {
        response.headers.append("Set-Cookie", c);
      }
    }

    console.info("Auth/me success", {
      scope: "auth.me",
      correlationId,
      type: "success",
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      refreshed: refreshedSetCookies.length > 0,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Auth/me unhandled error", {
      scope: "auth.me",
      correlationId,
      type: "unhandled_error",
      message,
      statusCode: 401,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Invalid or expired session", correlationId },
      { status: 401 }
    );
  }
}
