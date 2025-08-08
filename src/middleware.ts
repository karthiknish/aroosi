import { NextRequest, NextResponse } from "next/server";
import {
  convexAuthNextjsMiddleware,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

// Token-based approach (Authorization: Bearer <token>):
// - Do not rely on cookies at all.
// - Middleware only performs lightweight gating for known authenticated client routes.
// - Actual auth is enforced in API route handlers using Authorization headers.

// Public pages that never require auth
const publicRoutes = [
  "/",
  "/sign-in",
  // removed sign-up
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
  "/oauth",
  "/oauth/callback",
];

// Public API route prefixes (auth handled per-handler)
const publicApiRoutes = [
  "/api/auth", // sign-in, sign-up, refresh, logout, etc.
  "/api/contact",
  "/api/blog",
  "/api/stripe/webhook",
];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => {
    if (route === "/blog" && pathname.startsWith("/blog")) return true;
    return pathname === route;
  });
}

function isPublicApiRoute(pathname: string): boolean {
  return publicApiRoutes.some((route) => pathname.startsWith(route));
}

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

export default convexAuthNextjsMiddleware(async (request) => {
  const { pathname } = request.nextUrl;

  // Bypass for system/static paths
  const isSystemPath =
    pathname === "/404" ||
    pathname === "/500" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes("__next_static") ||
    pathname.includes("__next_data");
  if (isSystemPath) return NextResponse.next();

  // Minimal trace
  console.info("MW pass-through", { scope: "auth.middleware", path: pathname });

  // Skip middleware for static files and assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Always allow public pages and public API routes
  // Always allow public pages; Convex Auth handles /api/auth
  if (isPublicRoute(pathname)) return NextResponse.next();

  // For authenticated client routes, allow if Authorization header OR auth cookies exist, otherwise redirect to sign-in
  if (isAuthenticatedClientRoute(pathname)) {
    // Let Convex Auth determine auth state via cookies
    // If not authenticated, redirect to sign-in with callback
    // We can't call convexAuthNextjsToken here without context; rely on cookies being handled
    const cookies = request.cookies;
    const hasAuthCookie = Boolean(
      cookies.get("cvx-auth")?.value ||
      cookies.get("cvx-refresh")?.value
    );
    if (!hasAuthCookie) {
      return nextjsMiddlewareRedirect(request, "/sign-in");
    }
    return NextResponse.next();
  }

  // For all other routes, pass through; API handlers enforce auth via headers
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
