import { NextRequest, NextResponse } from "next/server";

/**
 * Logout: clear both access and refresh cookies server-side.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: "Logged out successfully" });

  // Determine cookie attributes based on current host (match signin route behavior)
  const url = new URL(request.url);
  const host = url.hostname; // e.g. aroosi.app, preview.vercel.app, localhost
  const isProdDomain = host === "aroosi.app" || host.endsWith(".aroosi.app");
  const isLocalhost =
    host === "localhost" || host.endsWith(".local") || host.endsWith(".test");
  const secure = url.protocol === "https:" && !isLocalhost;

  const expireAttrs = () => {
    const parts = [
      `Path=/`,
      `SameSite=Lax`,
      `Max-Age=0`,
    ];
    if (secure) parts.push(`Secure`);
    if (isProdDomain) parts.push(`Domain=.aroosi.app`);
    return parts.join("; ");
  };

  // Expire cookies immediately with environment-aware attributes
  response.headers.set(
    "Set-Cookie",
    `auth-token=; HttpOnly; ${expireAttrs()}`
  );
  response.headers.append(
    "Set-Cookie",
    `refresh-token=; HttpOnly; ${expireAttrs()}`
  );
  response.headers.append(
    "Set-Cookie",
    `authTokenPublic=; ${expireAttrs()}`
  );

  // Diagnostics for previews/local vs prod
  console.info("Cookie configuration diagnostics", {
    scope: "auth.cookies.logout",
    type: "env_info",
    samesite: "Lax",
    secure: secure ? "1" : "0",
    secureEffective: secure ? "1" : "0",
    domain: isProdDomain ? ".aroosi.app" : "(host-only)",
    host,
  });

  return response;
}
