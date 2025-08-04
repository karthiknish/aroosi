import type { NextRequest } from "next/server";
import { verifyAccessJWT } from "@/lib/auth/jwt";

/**
 * Centralized cookie-based auth session resolver for App Router API routes.
 *
 * Usage:
 * const { ok, userId, setCookiesToForward, errorResponse } = await getSessionFromRequest(req);
 * if (!ok) return errorResponse!;
 * if (setCookiesToForward.length) setCookiesToForward.forEach(c => res.headers.append("Set-Cookie", c));
 * // proceed with userId
 */
export async function getSessionFromRequest(req: NextRequest): Promise<{
  ok: boolean;
  userId?: string;
  setCookiesToForward: string[];
  errorResponse?: Response;
}> {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

  // Helper to parse multiple Set-Cookie headers joined in a single string
  const parseSetCookieHeader = (headerVal: string | null): string[] => {
    if (!headerVal) return [];
    // Split on comma only when followed by key=value (naive but generally works for our cookie names)
    return headerVal.split(/,(?=[^;]+=[^;]+)/).map((s) => s.trim());
  };

  const getCookie = (name: string): string | null => {
    try {
      const v = req.cookies.get(name)?.value;
      return v && v.trim() ? v : null;
    } catch {
      return null;
    }
  };

  const forwardSetCookies: string[] = [];

  // 1) Try existing access token from cookie
  let accessToken = getCookie("auth-token");
  let refreshToken = getCookie("refresh-token");

  // 2) If no access token, attempt a refresh if we have a refresh token cookie
  if (!accessToken && refreshToken) {
    try {
      const refreshUrl = new URL("/api/auth/refresh", req.url);
      const refreshResp = await fetch(refreshUrl.toString(), {
        method: "POST",
        headers: { cookie: req.headers.get("cookie") || "" },
      });
      if (refreshResp.ok) {
        // forward any Set-Cookie headers to caller so browser updates session
        const setCookieHeader = refreshResp.headers.get("set-cookie");
        const setCookies = parseSetCookieHeader(setCookieHeader);
        for (const c of setCookies) forwardSetCookies.push(c);

        // Extract newly issued auth-token from refresh response cookies
        const accessMatch = setCookies.find((c) => c.startsWith("auth-token="));
        if (accessMatch) {
          const m = accessMatch.match(/^auth-token=([^;]+)/);
          if (m) accessToken = decodeURIComponent(m[1]);
        }
      } else {
        // Refresh failed; fall through to error
      }
    } catch {
      // network failure - treat as no session
    }
  }

  if (!accessToken) {
    return {
      ok: false,
      setCookiesToForward: forwardSetCookies,
      errorResponse: json(401, { success: false, error: "No auth session" }),
    };
  }

  // 3) Verify access token claims (iss/aud/typ)
  try {
    const payload = await verifyAccessJWT(accessToken);
    const userId = payload.userId;
    if (!userId) {
      return {
        ok: false,
        setCookiesToForward: forwardSetCookies,
        errorResponse: json(401, { success: false, error: "Invalid session" }),
      };
    }
    return { ok: true, userId, setCookiesToForward: forwardSetCookies };
  } catch {
    // Try one final refresh attempt if we haven't tried yet
    if (refreshToken) {
      try {
        const refreshUrl = new URL("/api/auth/refresh", req.url);
        const refreshResp = await fetch(refreshUrl.toString(), {
          method: "POST",
          headers: { cookie: req.headers.get("cookie") || "" },
        });
        if (refreshResp.ok) {
          const setCookieHeader = refreshResp.headers.get("set-cookie");
          const setCookies = parseSetCookieHeader(setCookieHeader);
          for (const c of setCookies) forwardSetCookies.push(c);

          const accessMatch = setCookies.find((c) => c.startsWith("auth-token="));
          if (accessMatch) {
            const m = accessMatch.match(/^auth-token=([^;]+)/);
            if (m) {
              accessToken = decodeURIComponent(m[1]);
              // verify once more
              const payload = await verifyAccessJWT(accessToken);
              const userId = payload.userId;
              if (userId) {
                return { ok: true, userId, setCookiesToForward: forwardSetCookies };
              }
            }
          }
        }
      } catch {
        // ignore and return 401 below
      }
    }
    return {
      ok: false,
      setCookiesToForward: forwardSetCookies,
      errorResponse: json(401, { success: false, error: "Invalid or expired session" }),
    };
  }
}