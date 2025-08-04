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
  const startedAt = Date.now();
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    const cookies = req.cookies;
    const refreshToken = cookies.get("refresh-token")?.value;

    if (!refreshToken) {
      console.warn("Refresh missing token", {
        scope: "auth.refresh",
        correlationId,
        type: "missing_token",
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      const res = NextResponse.json(
        { error: "Missing refresh token", code: "MISSING_REFRESH", correlationId },
        { status: 401 }
      );
      // Clear any stray cookies using environment-aware attributes (expire immediately)
      {
        const url = new URL(req.url);
        const host = url.hostname;
        const isProdDomain = host === "aroosi.app" || host.endsWith(".aroosi.app");
        const isLocalhost =
          host === "localhost" || host.endsWith(".local") || host.endsWith(".test");
        const secure = url.protocol === "https:" && !isLocalhost;

        const expireAttrs = () => {
          const parts = [`Path=/`, `SameSite=Lax`, `Max-Age=0`];
          if (secure) parts.push(`Secure`);
          if (isProdDomain) parts.push(`Domain=.aroosi.app`);
          return parts.join("; ");
        };

        res.headers.set("Set-Cookie", `auth-token=; HttpOnly; ${expireAttrs()}`);
        res.headers.append("Set-Cookie", `refresh-token=; HttpOnly; ${expireAttrs()}`);
        res.headers.append("Set-Cookie", `authTokenPublic=; ${expireAttrs()}`);
      }
      return res;
    }

    // Convex client
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
      console.warn("Refresh rate limited ip", {
        scope: "auth.refresh",
        correlationId,
        type: "rate_limited_ip",
        retryAfter,
        statusCode: 429,
        durationMs: Date.now() - startedAt,
      });
      const res = NextResponse.json(
        { error: "Too many refresh attempts", code: "RATE_LIMITED", correlationId },
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
      console.warn("Refresh rate limited user", {
        scope: "auth.refresh",
        correlationId,
        type: "rate_limited_user",
        userId,
        retryAfter,
        statusCode: 429,
        durationMs: Date.now() - startedAt,
      });
      const res = NextResponse.json(
        { error: "Too many refresh attempts", code: "RATE_LIMITED", correlationId },
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
      console.warn("Refresh reuse detected", {
        scope: "auth.refresh",
        correlationId,
        type: "refresh_reuse",
        userId,
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      const res = NextResponse.json(
        { error: "Refresh token reuse detected", code: "REFRESH_REUSE", correlationId },
        { status: 401 }
      );
      // Clear cookies to force re-auth (environment-aware, expire immediately)
      {
        const url = new URL(req.url);
        const host = url.hostname;
        const isProdDomain = host === "aroosi.app" || host.endsWith(".aroosi.app");
        const isLocalhost =
          host === "localhost" || host.endsWith(".local") || host.endsWith(".test");
        const secure = url.protocol === "https:" && !isLocalhost;

        const expireAttrs = () => {
          const parts = [`Path=/`, `SameSite=Lax`, `Max-Age=0`];
          if (secure) parts.push(`Secure`);
          if (isProdDomain) parts.push(`Domain=.aroosi.app`);
          return parts.join("; ");
        };

        res.headers.set("Set-Cookie", `auth-token=; HttpOnly; ${expireAttrs()}`);
        res.headers.append("Set-Cookie", `refresh-token=; HttpOnly; ${expireAttrs()}`);
        res.headers.append("Set-Cookie", `authTokenPublic=; ${expireAttrs()}`);
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

    // Set cookies with environment-aware attributes (match signin)
    {
      const url = new URL(req.url);
      const host = url.hostname;
      const isProdDomain = host === "aroosi.app" || host.endsWith(".aroosi.app");
      const isLocalhost =
        host === "localhost" || host.endsWith(".local") || host.endsWith(".test");
      const secure = url.protocol === "https:" && !isLocalhost;

      const baseAttrs = (maxAgeSec: number) => {
        const parts = [
          `Path=/`,
          `HttpOnly`,
          `SameSite=Lax`,
          `Max-Age=${Math.max(1, Math.floor(maxAgeSec))}`,
        ];
        if (secure) parts.push(`Secure`);
        if (isProdDomain) parts.push(`Domain=.aroosi.app`);
        return parts.join("; ");
      };

      res.headers.set(
        "Set-Cookie",
        `auth-token=${newAccess}; ${baseAttrs(60 * 15)}`
      );
      res.headers.append(
        "Set-Cookie",
        `refresh-token=${newRefresh}; ${baseAttrs(60 * 60 * 24 * 7)}`
      );

      // Public echo cookie (optional)
      if (process.env.SHORT_PUBLIC_TOKEN === "1") {
        const publicParts = [
          `Path=/`,
          `SameSite=Lax`,
          `Max-Age=60`,
        ];
        if (secure) publicParts.push(`Secure`);
        if (isProdDomain) publicParts.push(`Domain=.aroosi.app`);
        res.headers.append(
          "Set-Cookie",
          `authTokenPublic=${newAccess}; ${publicParts.join("; ")}`
        );
      } else {
        const expiredParts = [
          `Path=/`,
          `SameSite=Lax`,
          `Max-Age=0`,
        ];
        if (secure) expiredParts.push(`Secure`);
        if (isProdDomain) expiredParts.push(`Domain=.aroosi.app`);
        res.headers.append("Set-Cookie", `authTokenPublic=; ${expiredParts.join("; ")}`);
      }

      // Diagnostics
      console.info("Cookie configuration diagnostics", {
        scope: "auth.cookies.refresh",
        type: "env_info",
        samesite: "Lax",
        secure: secure ? "1" : "0",
        secureEffective: secure ? "1" : "0",
        domain: isProdDomain ? ".aroosi.app" : "(host-only)",
        host,
      });
    }

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
    const res = NextResponse.json(
      { error: "Invalid refresh token", code: "INVALID_REFRESH", correlationId },
      { status: 401 }
    );
    // Clear cookies on invalid token (environment-aware, expire immediately)
    {
      const url = new URL(req.url);
      const host = url.hostname;
      const isProdDomain = host === "aroosi.app" || host.endsWith(".aroosi.app");
      const isLocalhost =
        host === "localhost" || host.endsWith(".local") || host.endsWith(".test");
      const secure = url.protocol === "https:" && !isLocalhost;

      const expireAttrs = () => {
        const parts = [`Path=/`, `SameSite=Lax`, `Max-Age=0`];
        if (secure) parts.push(`Secure`);
        if (isProdDomain) parts.push(`Domain=.aroosi.app`);
        return parts.join("; ");
      };

      res.headers.set("Set-Cookie", `auth-token=; HttpOnly; ${expireAttrs()}`);
      res.headers.append("Set-Cookie", `refresh-token=; HttpOnly; ${expireAttrs()}`);
      res.headers.append("Set-Cookie", `authTokenPublic=; ${expireAttrs()}`);
    }
    return res;
  }
}
