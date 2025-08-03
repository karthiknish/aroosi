import { NextRequest, NextResponse } from "next/server";
import { verifyAccessJWT, extractTokenFromHeader } from "@/lib/auth/jwt";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

/**
 * Returns current user's info and profile. Extensive fix:
 * - Avoids Convex auth-context dependent query to prevent profile: null immediately post-signup.
 * - Fetches user by email from JWT, then fetches profile by explicit userId.
 * - Preserves refresh flow and forwards Set-Cookie headers after rotation.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const bearerToken = extractTokenFromHeader(authHeader);
    const cookieToken = request.cookies.get("auth-token")?.value;

    const tokenToVerify = bearerToken || cookieToken || null;
    if (!tokenToVerify) {
      return NextResponse.json({ error: "No auth session" }, { status: 401 });
    }

    let refreshedSetCookies: string[] = [];

    let emailFromSession: string | null = null;
    let effectiveAccessToken: string | null = tokenToVerify;

    try {
      const payload = await verifyAccessJWT(tokenToVerify);
      emailFromSession = payload.email;
    } catch {
      const refreshCookie = request.cookies.get("refresh-token")?.value;
      if (!refreshCookie) {
        return NextResponse.json(
          { error: "Invalid or expired session" },
          { status: 401 }
        );
      }
      const refreshUrl = new URL("/api/auth/refresh", request.url);
      const refreshResp = await fetch(refreshUrl.toString(), {
        method: "POST",
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      });

      if (!refreshResp.ok) {
        return NextResponse.json(
          { error: "Invalid or expired session" },
          { status: 401 }
        );
      }

      const setCookieHeader = refreshResp.headers.get("set-cookie") || "";
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
        return NextResponse.json(
          { error: "Invalid or expired session" },
          { status: 401 }
        );
      }

      const payload = await verifyAccessJWT(newAccess);
      emailFromSession = payload.email;
      effectiveAccessToken = newAccess;
      refreshedSetCookies = cookies;
    }

    if (!emailFromSession) {
      return NextResponse.json({ error: "No auth session" }, { status: 401 });
    }

    // 1) Fetch user by email (identifier-based, no Convex auth context required)
    const user = await fetchQuery(api.users.getUserByEmail, {
      email: emailFromSession,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.banned) {
      return NextResponse.json({ error: "Account is banned" }, { status: 403 });
    }

    // 2) Fetch profile by explicit userId to avoid relying on Convex ctx.auth
    // Use public query that accepts userId
    const profileDoc = await fetchQuery(api.users.getProfileByUserIdPublic, {
      userId: user._id,
    });

    // Build minimal, stable profile payload for client gating
    const profile =
      profileDoc && typeof profileDoc === "object"
        ? {
            id: (profileDoc as any)._id,
            isProfileComplete: !!(profileDoc as any).isProfileComplete,
            isOnboardingComplete: !!(profileDoc as any).isOnboardingComplete,
          }
        : null;

    const response = NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        profile,
      },
      refreshed: refreshedSetCookies.length > 0,
    });

    if (refreshedSetCookies.length > 0) {
      for (const c of refreshedSetCookies) {
        response.headers.append("Set-Cookie", c);
      }
    }

    return response;
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Invalid or expired session" },
      { status: 401 }
    );
  }
}
