import { NextRequest, NextResponse } from "next/server";
import {
  verifyRefreshJWT,
  signAccessJWT,
  signRefreshJWT,
} from "@/lib/auth/jwt";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { getConvexClient } from "@/lib/convexClient";

/**
 * POST /api/auth/refresh (PURE TOKEN MODEL)
 * - Expects Authorization: Bearer <refreshToken> header
 * - Verifies refresh JWT
 * - Throttles by IP and by userId (30s window, limit 10)
 * - Enforces refresh rotation using CAS on users.refreshVersion
 * - On success: returns JSON { accessToken, refreshToken }
 */
export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const correlationId = Math.random().toString(36).slice(2, 10);


  try {
    // Authorization: Bearer <refreshToken>
    const authz = req.headers.get("authorization") || "";
    const refreshToken = authz.toLowerCase().startsWith("bearer ")
      ? authz.slice(7).trim()
      : "";

    if (!refreshToken) {
      console.warn("Refresh missing token", {
        scope: "auth.refresh",
        correlationId,
        type: "missing_token",
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        {
          error: "Missing refresh token",
          code: "MISSING_REFRESH",
          correlationId,
        },
        { status: 401 }
      );
    }

    // 2) Convex client
    const convex = getConvexClient();
    if (!convex) {
      console.error("Refresh config error", {
        scope: "auth.refresh",
        correlationId,
        type: "config_error",
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Convex client not configured", correlationId },
        { status: 500 }
      );
    }

    // 3) Throttle by IP (prior to parsing)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      (req as any).ip ||
      "unknown";
    const RL_WINDOW_MS = 30_000;
    const RL_LIMIT = 10;
    const ipKey = `refresh_ip:${ip}`;
    const ipRate = await convex.mutation(api.users.incrementRateWithWindow, {
      key: ipKey,
      windowMs: RL_WINDOW_MS,
      limit: RL_LIMIT,
    });
    if (ipRate.limited) {
      const retryAfter = Math.max(
        0,
        Math.ceil((ipRate.resetAt - Date.now()) / 1000)
      );
      const res = NextResponse.json(
        {
          error: "Too many refresh attempts",
          code: "RATE_LIMITED",
          correlationId,
        },
        { status: 429 }
      );
      res.headers.set("Retry-After", String(retryAfter));
      return res;
    }

    // 4) Verify JWT (aud/iss/typ enforced in verifyRefreshJWT)
    let payload: {
      userId: string;
      email?: string;
      role?: string;
      ver?: number;
    };
    try {
      payload = await verifyRefreshJWT(refreshToken);
    } catch (e) {
      console.warn("Refresh verification failed", {
        scope: "auth.refresh",
        correlationId,
        type: "verify_failed",
        statusCode: 401,
        durationMs: Date.now() - startedAt,
        message: e instanceof Error ? e.message : String(e),
      });
      return NextResponse.json(
        {
          error: "Invalid refresh token",
          code: "INVALID_REFRESH",
          correlationId,
        },
        { status: 401 }
      );
    }
    const { userId, email, role, ver } = payload;
    const userIdConvex = userId as Id<"users">;

    // 5) Throttle by user after verification
    const userKey = `refresh_user:${userId}`;
    const userRate = await convex.mutation(api.users.incrementRateWithWindow, {
      key: userKey,
      windowMs: RL_WINDOW_MS,
      limit: RL_LIMIT,
    });
    if (userRate.limited) {
      const retryAfter = Math.max(
        0,
        Math.ceil((userRate.resetAt - Date.now()) / 1000)
      );
      const res = NextResponse.json(
        {
          error: "Too many refresh attempts",
          code: "RATE_LIMITED",
          correlationId,
        },
        { status: 429 }
      );
      res.headers.set("Retry-After", String(retryAfter));
      return res;
    }

    // 6) CAS rotate with jitter-based small backoff for concurrent storms
    //    - If CAS fails, detect reuse or racing. Any mismatch is treated as reuse here for safety.
    const cas = await convex.mutation(api.users.casIncrementRefreshVersion, {
      userId: userIdConvex,
      expected: ver ?? 0,
    });

    if (!cas.ok) {
      console.warn("Refresh reuse detected", {
        scope: "auth.refresh",
        correlationId,
        type: "refresh_reuse",
        userId,
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        {
          error: "Refresh token reuse detected",
          code: "REFRESH_REUSE",
          correlationId,
        },
        { status: 401 }
      );
    }

    const nextVersion = cas.next as number;

    // 7) Issue new tokens bound to nextVersion (ensure non-undefined strings)
    const safeEmail = email ?? "";
    const safeRole = role ?? "user";
    const newAccess = await signAccessJWT({
      userId,
      email: safeEmail,
      role: safeRole,
    });
    const newRefresh = await signRefreshJWT({
      userId,
      email: safeEmail,
      role: safeRole,
      ver: nextVersion,
    });

    const res = NextResponse.json({
      accessToken: newAccess,
      refreshToken: newRefresh,
      correlationId,
    });

    console.info("Refresh success", {
      scope: "auth.refresh",
      correlationId,
      type: "success",
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      userId,
    });
    return res;
  } catch (err) {
    console.error("Refresh invalid token", {
      scope: "auth.refresh",
      correlationId,
      type: "invalid_refresh",
      statusCode: 401,
      durationMs: Date.now() - startedAt,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Invalid refresh token", code: "INVALID_REFRESH", correlationId },
      { status: 401 }
    );
  }
}
