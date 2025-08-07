import { NextRequest, NextResponse } from "next/server";
import { verifyRefreshJWT, signAccessJWT, signRefreshJWT } from "@/lib/auth/jwt";

/**
 * Extract the Bearer token from Authorization header
 */
function getBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const [scheme, token] = auth.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

/**
 * Optional: Replace with actual DB lookup if required by your security model.
 * For refresh rotation, persist and compare refresh "ver" per user.
 */
async function loadUserById(userId: string): Promise<{ id: string; email?: string; role?: string; banned?: boolean; refreshVer?: number } | null> {
  // TODO: Integrate with your user store and return the persisted refreshVer (default 0)
  return { id: userId, refreshVer: 0 };
}

/**
 * Optional: If you adopt rotation on each refresh, increment and persist user's refreshVer.
 */
async function maybeRotateUserRefreshVersion(_userId: string): Promise<number> {
  // TODO: Persist and return new refreshVer. For now, keep version static (0) for compatibility.
  return 0;
}

function withNoStore(res: NextResponse) {
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const refreshToken = getBearerToken(req);
    if (!refreshToken) {
      return withNoStore(NextResponse.json({ error: "Missing refresh token", code: "MISSING_REFRESH" }, { status: 400 }));
    }

    // Verify refresh using project-standard JOSE helpers
    const payload = await verifyRefreshJWT(refreshToken).catch(() => null);
    if (!payload?.userId) {
      return withNoStore(NextResponse.json({ error: "Invalid refresh token", code: "INVALID_REFRESH" }, { status: 401 }));
    }

    const user = await loadUserById(payload.userId);
    if (!user) {
      return withNoStore(NextResponse.json({ error: "User not found", code: "USER_NOT_FOUND" }, { status: 404 }));
    }
    if (user.banned) {
      return withNoStore(NextResponse.json({ error: "User not allowed", code: "USER_FORBIDDEN" }, { status: 403 }));
    }

    // Refresh token version check (if your DB persists refreshVer)
    const storedVer = typeof user.refreshVer === "number" ? user.refreshVer : 0;
    const tokenVer = typeof payload.ver === "number" ? payload.ver : 0;
    if (tokenVer !== storedVer) {
      return withNoStore(NextResponse.json({ error: "Refresh token revoked", code: "REFRESH_REVOKED" }, { status: 401 }));
    }

    // Optionally rotate on every refresh (increment DB ver)
    const nextVer = await maybeRotateUserRefreshVersion(user.id);

    // Sign new access/refresh with consistent issuer/audience and payload
    const newAccessToken = await signAccessJWT({
      userId: user.id,
      email: user.email || "",
      role: user.role || "user",
    });

    const newRefreshToken = await signRefreshJWT({
      userId: user.id,
      email: user.email || "",
      role: user.role || "user",
      ver: nextVer,
    });

    return withNoStore(
      NextResponse.json(
        {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
        { status: 200 }
      )
    );
  } catch (err) {
    console.error("Refresh error:", err);
    return withNoStore(NextResponse.json({ error: "Server error", code: "SERVER_ERROR" }, { status: 500 }));
  }
}

export async function GET() {
  return withNoStore(NextResponse.json({ error: "Method not allowed" }, { status: 405 }));
}
