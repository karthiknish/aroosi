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
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
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

  try {
    // Authorization: Bearer <accessToken>
    const authz = request.headers.get("authorization") || "";
    const accessToken = authz.toLowerCase().startsWith("bearer ")
      ? authz.slice(7).trim()
      : "";

    if (!accessToken) {
      log(scope, "warn", "Missing Authorization header", {
        correlationId,
        type: "no_authorization_header",
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return withNoStore(
        NextResponse.json(
          {
            error: "Missing Authorization header",
            code: "MISSING_ACCESS",
            correlationId,
          },
          { status: 401 }
        )
      );
    }

    // Verify access token
    let tokenPayload: { userId: string; email?: string; role?: string } | null =
      null;
    try {
      const { verifyAccessJWT } = await import("@/lib/auth/jwt");
      tokenPayload = await verifyAccessJWT(accessToken);
    } catch (e) {
      log(scope, "warn", "Access verification failed", {
        correlationId,
        type: "verify_failed",
        message: e instanceof Error ? e.message : String(e),
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return withNoStore(
        NextResponse.json(
          {
            error: "Invalid or expired access token",
            code: "ACCESS_INVALID",
            correlationId,
          },
          { status: 401 }
        )
      );
    }

    // Resolve current user (by Convex; no reliance on cookies)
    const current = await fetchQuery(
      api.users.getCurrentUserWithProfile,
      {}
    ).catch((e: unknown) => {
      log(scope, "error", "Convex getCurrentUserWithProfile failed", {
        correlationId,
        message: e instanceof Error ? e.message : String(e),
        durationMs: Date.now() - startedAt,
      });
      return null as any;
    });

    const user = (current as any)?.user ?? current ?? null;

    if (!user) {
      log(scope, "warn", "User not found", {
        correlationId,
        type: "user_not_found",
        statusCode: 404,
        durationMs: Date.now() - startedAt,
      });
      return withNoStore(
        NextResponse.json(
          {
            error: "User not found",
            code: "USER_NOT_FOUND",
            correlationId,
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
      });
      return withNoStore(
        NextResponse.json(
          { error: "Account is banned", correlationId },
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

    log(scope, "info", "Success", {
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return withNoStore(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(scope, "error", "Unhandled error", {
      correlationId,
      statusCode: 401,
      message,
      durationMs: Date.now() - startedAt,
    });
    return withNoStore(
      NextResponse.json(
        { error: "Invalid or expired session", correlationId },
        { status: 401 }
      )
    );
  }
}
