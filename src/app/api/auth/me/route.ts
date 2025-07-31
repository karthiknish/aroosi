import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, extractTokenFromHeader } from "@/lib/auth/jwt";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const bearerToken = extractTokenFromHeader(authHeader);
    // Support cookie-based session (set during signup)
    const cookieToken = request.cookies.get("auth-token")?.value;
    const sessionCookie = request.cookies.get("aroosi_session")?.value;

    let emailFromSession: string | null = null;
    let tokenToVerify: string | null = null;

    if (bearerToken) {
      tokenToVerify = bearerToken;
    } else if (cookieToken) {
      tokenToVerify = cookieToken;
    }

    // If we have a verified JWT source, verify it to derive email
    if (tokenToVerify) {
      const payload = await verifyJWT(tokenToVerify);
      emailFromSession = payload.email;
    } else if (sessionCookie) {
      // Fallback: decode lightweight session cookie created at signup
      try {
        const decoded = JSON.parse(Buffer.from(sessionCookie, "base64url").toString("utf8")) as {
          email?: string;
          userId?: string;
        };
        if (decoded?.email) {
          emailFromSession = decoded.email;
        }
      } catch {
        // ignore invalid cookie
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
    const profileRes = await fetchQuery(api.users.getCurrentUserWithProfile, {});
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
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }
}
