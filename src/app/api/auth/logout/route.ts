import { NextRequest, NextResponse } from "next/server";

/**
 * Logout: clear both access and refresh cookies server-side.
 */
export async function POST(_request: NextRequest) {
  const response = NextResponse.json({ message: "Logged out successfully" });

  // Expire cookies immediately
  response.headers.set(
    "Set-Cookie",
    `auth-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  response.headers.append(
    "Set-Cookie",
    `refresh-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  response.headers.append(
    "Set-Cookie",
    `authTokenPublic=; Path=/; SameSite=Lax; Max-Age=0`,
  );

  return response;
}
