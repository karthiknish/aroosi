import { NextRequest, NextResponse } from "next/server";

/**
 * Logout: clear both access and refresh cookies server-side.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: "Logged out successfully" });

  // Standardized cookie expiry using centralized helper
  const { getExpireCookieAttrs } = await import("@/lib/auth/cookies");

  response.headers.set(
    "Set-Cookie",
    `auth-token=; HttpOnly; ${getExpireCookieAttrs()}`
  );
  response.headers.append(
    "Set-Cookie",
    `refresh-token=; HttpOnly; ${getExpireCookieAttrs()}`
  );
  response.headers.append(
    "Set-Cookie",
    `authTokenPublic=; ${getExpireCookieAttrs()}`
  );

  return response;
}
