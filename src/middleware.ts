import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// IMPORTANT: Do NOT import firebase-admin in middleware (Edge runtime) – it pulls in Node-only modules (fs, net, etc.)
// that break the build with UnhandledSchemeError. We only perform a lightweight check here.
// Full token verification (signature, revocation) happens within Node.js API routes / server components.

// Lightweight (non-cryptographic) JWT payload decoder for gating purposes only.
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(payload, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// Public pages that never require auth
const publicRoutes = [
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/about",
  "/how-it-works",
  "/privacy",
  "/pricing",
  "/terms",
  "/faq",
  "/blog",
  "/contact",
  "/forgot-password",
  "/reset-password",
  "/api/auth/signin",
  "/api/auth/signup",
  "/api/auth/reset-password",
  "/api/auth/logout",
];

// Public API route prefixes (auth handled per-handler)
const publicApiRoutes = ["/api/contact", "/api/blog", "/api/stripe/webhook"];

// Known authenticated client routes (pages). Unknown routes fall through to 404.
function isAuthenticatedClientRoute(pathname: string): boolean {
  return (
    pathname === "/search" ||
    pathname.startsWith("/matches") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/usage") ||
    pathname.startsWith("/premium-settings") ||
    pathname.startsWith("/plans") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/(authenticated)")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public pages and public API routes
  const isPublicRoute = publicRoutes.some((route) => {
    // Handle routes with wildcards like /sign-in(.*)
    if (route.includes("(.*")) {
      const regexPattern = route.replace(/\(\.\*\)/g, ".*");
      return new RegExp(`^${regexPattern}$`).test(pathname);
    }
    return route === pathname;
  });

  const isPublicApiRoute = publicApiRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isPublicRoute || isPublicApiRoute) {
    return NextResponse.next();
  }

  // For authenticated client routes, check for Firebase auth
  if (isAuthenticatedClientRoute(pathname)) {
    // Get the auth token from cookies
    const token = request.cookies.get("firebaseAuthToken")?.value;

    // If user is not authenticated, redirect to sign-in
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }

    // OPTIONAL: Perform minimal sanity check on token payload (expiration, issued-at) without signature verification.
    // Signature verification must be enforced server-side before any sensitive operation.
    const payload = decodeJwtPayload(token);
    if (payload) {
      const nowSec = Math.floor(Date.now() / 1000);
      if (
        (payload.exp && payload.exp < nowSec) ||
        (payload.iat && payload.iat > nowSec + 60)
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/sign-in";
        return NextResponse.redirect(url);
      }
    }
    // Proceed; downstream server handlers will fully verify.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
