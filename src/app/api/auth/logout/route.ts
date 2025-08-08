import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Clear all auth-related cookies
  const isProd = process.env.NODE_ENV === "production";
  const prefix = isProd ? "__Secure-" : "";

  const expire = `${new Date(0).toUTCString()}`;
  const base = `Path=/; HttpOnly; SameSite=Lax${isProd ? "; Secure" : ""}`;

  const clearAuth = `${prefix}auth-token=; Expires=${expire}; Max-Age=0; ${base}`;
  const clearRefresh = `${prefix}refresh-token=; Expires=${expire}; Max-Age=0; ${base}`;
  const clearNextAuth1 = `${prefix}next-auth.session-token=; Expires=${expire}; Max-Age=0; ${base}`;
  const clearNextAuth2 = `next-auth.session-token=; Expires=${expire}; Max-Age=0; ${base}`;
  const clearConvexSession = `convex-session=; Expires=${expire}; Max-Age=0; ${base}`;

  const res = NextResponse.json({ success: true, message: "You have been successfully signed out." }, { status: 200 });
  res.headers.append("Set-Cookie", clearAuth);
  res.headers.append("Set-Cookie", clearRefresh);
  res.headers.append("Set-Cookie", clearNextAuth1);
  res.headers.append("Set-Cookie", clearNextAuth2);
  res.headers.append("Set-Cookie", clearConvexSession);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
