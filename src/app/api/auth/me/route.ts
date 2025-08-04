import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

/**
 * /api/auth/me
 * Cookie-only session. No Authorization header or token verification.
 * Structured logs and correlationId; precise 4xx reasons; forwards refreshed cookies if present.
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

function readCookie(request: NextRequest, name: string): string | null {
  try {
    const v = request.cookies.get(name)?.value;
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const scope = "auth.me#GET";
  const correlationId = request.headers.get("x-request-id") || Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    // Cookie-only session lookup
    const sessionToken =
      readCookie(request, "__Secure-next-auth.session-token") ||
      readCookie(request, "next-auth.session-token") ||
      readCookie(request, "__Secure-session-token") ||
      readCookie(request, "session-token") ||
      readCookie(request, "auth-token") ||
      readCookie(request, "jwt");

    if (!sessionToken) {
      log(scope, "warn", "Missing session cookie", {
        correlationId,
        type: "no_session_cookie",
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "No auth session", correlationId },
        { status: 401 }
      );
    }

    // Optional: attempt transparent refresh if a refresh cookie exists and app provides /api/auth/refresh
    // On detected reuse (401 REFRESH_REUSE), immediately clear session cookies and return 401
    let refreshedSetCookies: string[] = [];
    const maybeRefresh = readCookie(request, "refresh-token");
    if (maybeRefresh) {
      try {
        const refreshUrl = new URL("/api/auth/refresh", request.url);
        const refreshResp = await fetch(refreshUrl.toString(), {
          method: "POST",
          headers: {
            cookie: request.headers.get("cookie") || "",
            accept: "application/json",
          },
          redirect: "manual",
        });

        if (refreshResp.ok) {
          const setCookieHeader = refreshResp.headers.get("set-cookie") || "";
          const cookies = setCookieHeader ? setCookieHeader.split(/,(?=[^;]+=[^;]+)/) : [];
          if (cookies.length > 0) {
            refreshedSetCookies = cookies;
            log(scope, "info", "Session refreshed via cookie", {
              correlationId,
            });
          }
        } else {
          const text = await refreshResp.text().catch(() => "");
          const bodyPreview = text.slice(0, 160);
          log(scope, "warn", "Refresh attempt failed", {
            correlationId,
            status: refreshResp.status,
            bodyPreview,
          });
          // If refresh reuse was detected, terminate early and clear cookies client-side
          if (refreshResp.status === 401 && bodyPreview.includes("REFRESH_REUSE")) {
            const resp = NextResponse.json(
              { error: "Invalid or expired session", code: "REFRESH_REUSE", correlationId },
              { status: 401 }
            );
            // Forward any Set-Cookie headers from refresh (these already clear cookies)
            const setCookieHeader = refreshResp.headers.get("set-cookie") || "";
            const cookies = setCookieHeader ? setCookieHeader.split(/,(?=[^;]+=[^;]+)/) : [];
            for (const c of cookies) resp.headers.append("Set-Cookie", c);
            return resp;
          }
        }
      } catch (err) {
        log(scope, "warn", "Refresh attempt error", {
          correlationId,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Resolve the current user via existing server function
    const current = await fetchQuery(api.users.getCurrentUserWithProfile, {}).catch((e: unknown) => {
      log(scope, "error", "Convex getCurrentUserWithProfile failed", {
        correlationId,
        message: e instanceof Error ? e.message : String(e),
        durationMs: Date.now() - startedAt,
      });
      return null as any;
    });

    const user = (current as any)?.user ?? current ?? null;

    if (!user) {
      // If we just refreshed, treat missing user as invalid session (avoid 404 confusion post-reuse)
      const status = refreshedSetCookies.length > 0 ? 401 : 404;
      const code = refreshedSetCookies.length > 0 ? "SESSION_INVALID" : "USER_NOT_FOUND";
      log(scope, "warn", status === 401 ? "Invalid session after refresh" : "User not found", {
        correlationId,
        type: status === 401 ? "session_invalid" : "user_not_found",
        statusCode: status,
        durationMs: Date.now() - startedAt,
      } as any);
      return NextResponse.json(
        { error: status === 401 ? "Invalid or expired session" : "User not found", code, correlationId },
        { status }
      );
    }

    if (user.banned) {
      log(scope, "warn", "Banned user access", {
        correlationId,
        userId: String(user._id),
        statusCode: 403,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Account is banned", correlationId },
        { status: 403 }
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
      refreshed: refreshedSetCookies.length > 0,
      correlationId,
    });

    // Forward any refreshed cookies so the browser updates its session
    if (refreshedSetCookies.length > 0) {
      for (const c of refreshedSetCookies) {
        response.headers.append("Set-Cookie", c);
      }
    }

    log(scope, "info", "Success", {
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      refreshed: refreshedSetCookies.length > 0,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(scope, "error", "Unhandled error", {
      correlationId,
      statusCode: 401,
      message,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Invalid or expired session", correlationId },
      { status: 401 }
    );
  }
}
