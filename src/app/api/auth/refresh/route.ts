import { NextRequest, NextResponse } from "next/server";
import { verifyRefreshJWT, signAccessJWT, signRefreshJWT } from "@/lib/auth/jwt";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";

/**
 * POST /api/auth/refresh
 * - Reads refresh-token cookie
 * - Verifies refresh JWT
 * - Checks Convex users.refreshVersion for rotation enforcement
 * - Increments version and returns new access (15m) + refresh (7d) cookies
 */
export async function POST(req: NextRequest) {
  try {
    const cookies = req.headers.get("cookie") || "";
    const refreshCookie = cookies
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("refresh-token="));

    if (!refreshCookie) {
      return NextResponse.json({ error: "Missing refresh token" }, { status: 401 });
    }

    const refreshToken = decodeURIComponent(refreshCookie.split("=")[1]);

    // Verify refresh JWT
    const payload = await verifyRefreshJWT(refreshToken);
    const { userId, email, role, ver } = payload;

    // Convex client
    const convex = getConvexClient();
    if (!convex) {
      return NextResponse.json(
        { error: "Convex client not configured" },
        { status: 500 }
      );
    }

    // Load current user doc to check refreshVersion
    const userDoc = await convex.query(api.users.getUserById, { userId: userId as any });
    const currentVersion = (userDoc as any)?.refreshVersion ?? 0;

    // Enforce rotation: token version must match current
    if ((ver ?? 0) !== currentVersion) {
      return NextResponse.json({ error: "Stale refresh token" }, { status: 401 });
    }

    // Rotate version
    await convex.mutation(api.users.incrementRefreshVersion, { userId: userId as any });
    const newVersion = currentVersion + 1;

    // Issue new tokens
    const newAccess = await signAccessJWT({ userId, email, role });
    const newRefresh = await signRefreshJWT({ userId, email, role, ver: newVersion });

    const res = NextResponse.json({ success: true, token: newAccess });

    // Set cookies
    res.headers.set(
      "Set-Cookie",
      `auth-token=${newAccess}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 15}`
    );
    res.headers.append(
      "Set-Cookie",
      `refresh-token=${newRefresh}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
    );
    res.headers.append(
      "Set-Cookie",
      `authTokenPublic=${newAccess}; Path=/; SameSite=Lax; Max-Age=${60 * 15}`
    );

    return res;
  } catch (err) {
    return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
  }
}