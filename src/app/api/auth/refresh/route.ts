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
 * POST /api/auth/refresh
 * - Reads refresh-token cookie
 * - Verifies refresh JWT
 * - Throttles by IP and by userId (30s window, limit 10)
 * - Enforces refresh rotation using CAS on users.refreshVersion
 * - Detects reuse (CAS failure) without extra bump and clears cookies
 * - On success: increments version and returns new access (15m) + refresh (7d) cookies
 */
export async function POST(req: NextRequest) {
  try {
    const cookies = req.cookies;
    const refreshToken = cookies.get("refresh-token")?.value;

    if (!refreshToken) {
      const res = NextResponse.json(
        { error: "Missing refresh token", code: "MISSING_REFRESH" },
        { status: 401 }
      );
      // Clear any stray cookies using centralized helper (expire immediately)
      {
        const { getAuthCookieAttrs, getPublicCookieAttrs } = await import(
          "@/lib/auth/cookies"
        );
        const expiredAuth = getAuthCookieAttrs(0).replace(
          /Max-Age=\d+/,
          "Max-Age=0"
        );
        const expiredPublic = getPublicCookieAttrs(0).replace(
          /Max-Age=\d+/,
          "Max-Age=0"
        );
        res.headers.set("Set-Cookie", `auth-token=; ${expiredAuth}`);
        res.headers.append("Set-Cookie", `refresh-token=; ${expiredAuth}`);
        res.headers.append("Set-Cookie", `authTokenPublic=; ${expiredPublic}`);
      }
      return res;
    }

    // Convex client
    const convex = getConvexClient();
    if (!convex) {
      return NextResponse.json(
        { error: "Convex client not configured" },
        { status: 500 }
      );
    }

    // Throttle by IP first (prior to any token parsing)
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
        { error: "Too many refresh attempts", code: "RATE_LIMITED" },
        { status: 429 }
      );
      res.headers.set("Retry-After", String(retryAfter));
      return res;
    }

    // Verify refresh JWT
    const payload = await verifyRefreshJWT(refreshToken);
    const { userId, email, role, ver } = payload;

    // Ensure userId has the correct type from JWT verification
    const userIdConvex = userId as Id<"users">;

    // Throttle by user as well (after verifying JWT)
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
        { error: "Too many refresh attempts", code: "RATE_LIMITED" },
        { status: 429 }
      );
      res.headers.set("Retry-After", String(retryAfter));
      return res;
    }

    // Use CAS to safely rotate only if the presented token is current
    const cas = await convex.mutation(api.users.casIncrementRefreshVersion, {
      userId: userIdConvex,
      expected: ver ?? 0,
    });

    if (!cas.ok) {
      // Reuse detected: no extra bump; just clear cookies and signal reuse
      const res = NextResponse.json(
        { error: "Refresh token reuse detected", code: "REFRESH_REUSE" },
        { status: 401 }
      );
      // Clear cookies to force re-auth (centralized helper, expire immediately)
      {
        const { getAuthCookieAttrs, getPublicCookieAttrs } = await import(
          "@/lib/auth/cookies"
        );
        const expiredAuth = getAuthCookieAttrs(0).replace(
          /Max-Age=\d+/,
          "Max-Age=0"
        );
        const expiredPublic = getPublicCookieAttrs(0).replace(
          /Max-Age=\d+/,
          "Max-Age=0"
        );
        res.headers.set("Set-Cookie", `auth-token=; ${expiredAuth}`);
        res.headers.append("Set-Cookie", `refresh-token=; ${expiredAuth}`);
        res.headers.append("Set-Cookie", `authTokenPublic=; ${expiredPublic}`);
      }
      return res;
    }

    const nextVersion = cas.next as number;

    // Issue new tokens bound to the nextVersion
    const newAccess = await signAccessJWT({ userId, email, role });
    const newRefresh = await signRefreshJWT({
      userId,
      email,
      role,
      ver: nextVersion,
    });

    const res = NextResponse.json({ success: true, token: newAccess });

    // Use centralized cookie helpers for parity across routes
    const { getAuthCookieAttrs, getPublicCookieAttrs } = await import(
      "@/lib/auth/cookies"
    );

    res.headers.set(
      "Set-Cookie",
      `auth-token=${newAccess}; ${getAuthCookieAttrs(60 * 15)}`
    );
    res.headers.append(
      "Set-Cookie",
      `refresh-token=${newRefresh}; ${getAuthCookieAttrs(60 * 60 * 24 * 7)}`
    );

    // Only set public echo cookie if explicitly enabled
    if (process.env.SHORT_PUBLIC_TOKEN === "1") {
      res.headers.append(
        "Set-Cookie",
        `authTokenPublic=${newAccess}; ${getPublicCookieAttrs(60)}`
      );
    } else {
      // Ensure any prior public cookie is cleared (defense-in-depth)
      // Construct an expired cookie using helper and overriding Max-Age=0
      const expiredPublic = getPublicCookieAttrs(0).replace(
        /Max-Age=\d+/,
        "Max-Age=0"
      );
      res.headers.append("Set-Cookie", `authTokenPublic=; ${expiredPublic}`);
    }

    return res;
  } catch (err) {
    const res = NextResponse.json(
      { error: "Invalid refresh token", code: "INVALID_REFRESH" },
      { status: 401 }
    );
    // Clear cookies on invalid token (centralized helper, expire immediately)
    {
      const { getAuthCookieAttrs, getPublicCookieAttrs } = await import(
        "@/lib/auth/cookies"
      );
      const expiredAuth = getAuthCookieAttrs(0).replace(
        /Max-Age=\d+/,
        "Max-Age=0"
      );
      const expiredPublic = getPublicCookieAttrs(0).replace(
        /Max-Age=\d+/,
        "Max-Age=0"
      );
      res.headers.set("Set-Cookie", `auth-token=; ${expiredAuth}`);
      res.headers.append("Set-Cookie", `refresh-token=; ${expiredAuth}`);
      res.headers.append("Set-Cookie", `authTokenPublic=; ${expiredPublic}`);
    }
    return res;
  }
}
