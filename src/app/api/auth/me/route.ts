import { NextRequest, NextResponse } from "next/server";
import { verifyAccessJWT, extractTokenFromHeader } from "@/lib/auth/jwt";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const bearerToken = extractTokenFromHeader(authHeader);
    const cookieToken = request.cookies.get("auth-token")?.value;

    // Prefer Authorization header, then cookie
    const tokenToVerify = bearerToken || cookieToken || null;

    if (!tokenToVerify) {
      return NextResponse.json({ error: "No auth session" }, { status: 401 });
    }

    // Verify access token; if expired/invalid, attempt transparent refresh using refresh-token
    let emailFromSession: string | null = null;
    try {
      const payload = await verifyAccessJWT(tokenToVerify);
      emailFromSession = payload.email;
    } catch {
      // Attempt refresh only if refresh-token exists
      const refreshCookie = request.cookies.get("refresh-token")?.value;
      if (!refreshCookie) {
        return NextResponse.json(
          { error: "Invalid or expired session" },
          { status: 401 }
        );
      }
      // Proxy a server-side refresh call
      const refreshUrl = new URL("/api/auth/refresh", request.url);
      const refreshResp = await fetch(refreshUrl.toString(), {
        method: "POST",
        // Forward cookies so refresh endpoint can read refresh-token
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

      // Extract new auth-token from Set-Cookie for immediate verification
      const setCookieHeader = refreshResp.headers.get("set-cookie") || "";
      // Parse Set-Cookie header more robustly
      const cookies = setCookieHeader.split(/,(?=[^;]+=[^;]+)/);
      let newAccess = null;
      for (const cookie of cookies) {
        const authMatch = cookie.match(/auth-token=([^;]+)/);
        if (authMatch) {
          newAccess = decodeURIComponent(authMatch[1]);
          break;
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

      // Return response with cookies from refresh so browser stores them
      // We still proceed to fetch and return the user JSON payload below.
      // Compose downstream JSON and append cookies from refresh response.
      const passthrough = NextResponse.next();
      const refreshedCookies =
        refreshResp.headers.getSetCookie?.() as unknown as string[] | undefined;
      if (Array.isArray(refreshedCookies)) {
        for (const c of refreshedCookies) {
          passthrough.headers.append("Set-Cookie", c);
        }
      }
    }

    if (!emailFromSession) {
      return NextResponse.json({ error: "No auth session" }, { status: 401 });
    }

    // Get user by email
    const user = await fetchQuery(api.users.getUserByEmail, {
      email: emailFromSession,
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.banned) {
      return NextResponse.json({ error: "Account is banned" }, { status: 403 });
    }

    // Attach profile for client-side gating
    const profileRes = await fetchQuery(
      api.users.getCurrentUserWithProfile,
      {}
    );
    const profile = profileRes?.profile ?? null;

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Invalid or expired session" },
      { status: 401 }
    );
  }
}
