import type { NextRequest } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

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
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
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

  // Use Convex cookie session to resolve identity
  const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";
  if (!CONVEX_URL) {
    return {
      ok: false,
      setCookiesToForward: forwardSetCookies,
      errorResponse: json(500, {
        success: false,
        error: "Convex not configured",
      }),
    };
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    // Ask Convex who the user is via auth.requireIdentity action
    const identity = await (client as any).action(
      (api as any).auth.requireIdentity,
      {},
      { headers: { cookie: cookieHeader } }
    );
    const email = identity?.email ?? null;
    if (!email) {
      return {
        ok: false,
        setCookiesToForward: forwardSetCookies,
        errorResponse: json(401, { success: false, error: "No auth session" }),
      };
    }

    // Map to our users table to get userId
    const user = await (client as any).query(
      (api as any).users.getUserByEmail,
      { email },
      { headers: { cookie: cookieHeader } }
    );
    if (!user?._id) {
      return {
        ok: false,
        setCookiesToForward: forwardSetCookies,
        errorResponse: json(404, { success: false, error: "User not found" }),
      };
    }
    return {
      ok: true,
      userId: String(user._id),
      setCookiesToForward: forwardSetCookies,
    };
  } catch (e) {
    return {
      ok: false,
      setCookiesToForward: forwardSetCookies,
      errorResponse: json(401, {
        success: false,
        error: "Invalid or expired session",
      }),
    };
  }
}