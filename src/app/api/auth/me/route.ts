import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * /api/auth/me (PURE TOKEN MODEL)
 * Authorization-based session using Bearer access token in headers.
 * Structured logs and correlationId; precise 4xx reasons; Cache-Control: no-store on all responses.
 */
function log(scope: string, level: "info" | "warn" | "error", message: string, extra?: Record<string, unknown>) {
  const payload = {
    scope,
    level,
    message,
    ts: new Date().toISOString(),
    ...((extra && Object.keys(extra).length > 0) ? { extra } : {}),
  };
  // Ensure log level maps consistently for tooling
  switch (level) {
    case "error":
      console.error(payload);
      break;
    case "warn":
      console.warn(payload);
      break;
    default:
      console.info(payload);
  }
}


// Ensure Cache-Control: no-store on all response paths
function withNoStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(request: NextRequest) {
  const scope = "auth.me#GET";
  const correlationId =
    request.headers.get("x-request-id") ||
    Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  // Capture caller hint (page/route) if provided by clients
  const fromPage =
    request.headers.get("x-page") ||
    request.nextUrl.searchParams.get("from") ||
    request.headers.get("referer") ||
    undefined;

  try {
    // Prefer centralized Bearer parsing + verification for consistency
    const { requireAuth, AuthError, authErrorResponse } = await import("@/lib/auth/requireAuth");
    let tokenPayload: { userId: string; email?: string; role?: string };
    try {
      tokenPayload = (await requireAuth(request)) as any;
    } catch (e) {
      if (e instanceof AuthError) {
        log(scope, "warn", "AuthError in /api/auth/me", {
          correlationId,
          type: e.code,
          statusCode: e.status,
          durationMs: Date.now() - startedAt,
          fromPage,
        });
        // Return structured error payload for frontend toast consumption
        // Note: fromPage is included in logs and JSON responses below, but not a supported field of authErrorResponse meta
        const res = authErrorResponse(e.message, { status: e.status, code: e.code, correlationId });
        return withNoStore(res);
      }
      log(scope, "warn", "Unexpected auth failure in /api/auth/me", {
        correlationId,
        type: "unexpected_auth_failure",
        statusCode: 401,
        durationMs: Date.now() - startedAt,
        fromPage,
      });
      // Note: fromPage is included in logs and JSON responses below, but not a supported field of authErrorResponse meta
      const res = authErrorResponse("Invalid or expired access token", { status: 401, code: "ACCESS_INVALID", correlationId });
      return withNoStore(res);
    }

    // Fallback to existing Convex query until explicit-by-id variant is available
    const current = await fetchQuery(api.users.getCurrentUserWithProfile, {} as any).catch((e: unknown) => {
      log(scope, "error", "Convex getCurrentUserWithProfile failed", {
        correlationId,
        message: e instanceof Error ? e.message : String(e),
        durationMs: Date.now() - startedAt,
      });
      return null as any;
    });

    const user = (current as any)?.user ?? current ?? null;

    if (!user) {
      const duration = Date.now() - startedAt;
      // Soften log level for very-fast misses which are often hydration/propagation races
      const level: "info" | "warn" = duration < 300 ? "info" : "warn";
      log(scope, level, "User not found", {
        correlationId,
        type: "user_not_found",
        statusCode: 404,
        durationMs: duration,
        fromPage,
      });
      // Ensure consistent structured error for frontend toasts
      return withNoStore(
        NextResponse.json(
          {
            error: "User not found",
            code: "USER_NOT_FOUND",
            correlationId,
            fromPage,
          },
          { status: 404 }
        )
      );
    }

    if (user.banned) {
      log(scope, "warn", "Banned user access", {
        correlationId,
        userId: String(user._id),
        statusCode: 403,
        durationMs: Date.now() - startedAt,
        fromPage,
      });
      return withNoStore(
        NextResponse.json(
          { error: "Account is banned", code: "USER_FORBIDDEN", correlationId, fromPage },
          { status: 403 }
        )
      );
    }

    const profile = await fetchQuery(api.users.getProfileByUserIdPublic, {
      userId: user._id as Id<"users">,
    }).catch((e: unknown) => {
      log(scope, "error", "Convex profile fetch failed", {
        correlationId,
        message: e instanceof Error ? e.message : String(e),
        durationMs: Date.now() - startedAt,
      });
      return null;
    });

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
      correlationId,
    });
    // No Set-Cookie usage in pure token model; ensure no-store

    log(scope, "info", "Success", {
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      fromPage,
    });
    return withNoStore(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(scope, "error", "Unhandled error", {
      correlationId,
      statusCode: 500,
      message,
      durationMs: Date.now() - startedAt,
      fromPage,
    });
    return withNoStore(
      NextResponse.json(
        { error: "Server error", code: "SERVER_ERROR", correlationId, fromPage },
        { status: 500 }
      )
    );
  }
}
