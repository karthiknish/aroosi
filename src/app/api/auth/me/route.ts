import { NextRequest, NextResponse } from "next/server";
import type { Id } from "@convex/_generated/dataModel";

/**
 * /api/auth/me (Convex cookie session)
 * - Reads identity via Convex cookie session (handled by server utilities).
 * - Returns user and minimal profile data; always sets Cache-Control: no-store.
 * - Preserves structured logs and diagnostics.
 */
function log(
  scope: string,
  level: "info" | "warn" | "error",
  message: string,
  extra?: Record<string, unknown>
) {
  const payload = {
    scope,
    level,
    message,
    ts: new Date().toISOString(),
    ...(extra && Object.keys(extra).length > 0 ? { extra } : {}),
  };
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

  // Debug: Log incoming headers (non-sensitive)
  try {
    const headersObj: Record<string, string> = {};
    for (const [k, v] of request.headers.entries()) headersObj[k] = v;
    console.info("[auth.me] Incoming request headers", {
      correlationId,
      headers: headersObj,
    });
  } catch (e) {
    console.warn("[auth.me] Failed to log headers", {
      correlationId,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  const fromPage =
    request.headers.get("x-page") ||
    request.nextUrl.searchParams.get("from") ||
    request.headers.get("referer") ||
    undefined;

  try {
    // If you have a specific cookie-aware helper, you can still import it here.
    // Otherwise, rely on the new convex* helpers directly for profile fetching below.
    const current = null as any;

    const user = (current as any)?.user ?? current ?? null;

    if (!user) {
      const duration = Date.now() - startedAt;
      const level: "info" | "warn" = duration < 300 ? "info" : "warn";
      const referer = request.headers.get("referer") || undefined;

      log(scope, level, "User not found", {
        correlationId,
        type: "user_not_found",
        statusCode: 404,
        durationMs: duration,
        fromPage,
        hints: {
          referer,
          likelyRace: duration < 300,
          advisory:
            "If immediately post-signin, this is likely a propagation race. Client should tolerate a brief 404 or avoid verification.",
        },
      });
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
          {
            error: "Account is banned",
            code: "USER_FORBIDDEN",
            correlationId,
            fromPage,
          },
          { status: 403 }
        )
      );
    }

    // Fetch minimal profile using cookie-aware convex helper with generated api reference
    const { convexQueryWithAuth } = await import("@/lib/convexServer");
    const profile = await convexQueryWithAuth(
      request,
      (await import("@convex/_generated/api")).api.users.getProfileByUserIdPublic,
      { userId: user._id as Id<"users"> }
    ).catch((e: unknown) => {
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
      fromPage,
    });

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
        {
          error: "Server error",
          code: "SERVER_ERROR",
          correlationId,
          fromPage,
        },
        { status: 500 }
      )
    );
  }
}
