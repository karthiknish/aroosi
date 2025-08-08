import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

export async function POST(request: Request) {
  try {
    // Get the session token from cookies
    const cookieHeader = request.headers.get("cookie");
    const cookies = cookieHeader?.split(";").reduce(
      (acc, cookie) => {
        const [name, value] = cookie.trim().split("=");
        acc[name] = value;
        return acc;
      },
      {} as Record<string, string>
    );
    
    const sessionToken = cookies?.["convex-session"];
    if (sessionToken) {
      // Create Convex client with session token
      const convex = new ConvexHttpClient(
        process.env.NEXT_PUBLIC_CONVEX_URL!
      );
      
      // Set the session token for authenticated requests
      convex.setAuth(sessionToken);

      // Call signOut action to invalidate the session
      await convex.action("auth:signOut", {}).catch(() => {
        // Ignore errors during sign out
      });
    }
  } catch (e) {
    // Ignore errors during sign out
  }

  // Clear the convex-session cookie
  const isProd = process.env.NODE_ENV === "production";
  const prefix = isProd ? "__Secure-" : "";

  const expire = `${new Date(0).toUTCString()}`;
  const base = `Path=/; HttpOnly; SameSite=Lax${isProd ? "; Secure" : ""}`;

  const clearAuth = `${prefix}auth-token=; Expires=${expire}; Max-Age=0; ${base}`;
  const clearRefresh = `${prefix}refresh-token=; Expires=${expire}; Max-Age=0; ${base}`;
  const clearNextAuth1 = `${prefix}next-auth.session-token=; Expires=${expire}; Max-Age=0; ${base}`;
  const clearNextAuth2 = `next-auth.session-token=; Expires=${expire}; Max-Age=0; ${base}`;
  const clearConvexSession = `convex-session=; Expires=${expire}; Max-Age=0; ${base}`;

  const res = NextResponse.json({ success: true }, { status: 200 });
  res.headers.append("Set-Cookie", clearAuth);
  res.headers.append("Set-Cookie", clearRefresh);
  res.headers.append("Set-Cookie", clearNextAuth1);
  res.headers.append("Set-Cookie", clearNextAuth2);
  res.headers.append("Set-Cookie", clearConvexSession);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
