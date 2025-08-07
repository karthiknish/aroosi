import { NextRequest, NextResponse } from "next/server";

// Token-based approach (Authorization: Bearer <token>):
// - Do not rely on cookies at all.
// - Middleware only performs lightweight gating for known authenticated client routes.
// - Actual auth is enforced in API route handlers using Authorization headers.

// Public pages that never require auth
const publicRoutes = [
  "/",
  "/sign-in",
  "/sign-up",
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

export async function middleware(request: NextRequest) {
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
  if (isPublicRoute(pathname) || isPublicApiRoute(pathname)) {
    return NextResponse.next();
  }

  // For authenticated client routes, allow if Authorization header OR auth cookies exist, otherwise redirect to sign-in
  if (isAuthenticatedClientRoute(pathname)) {
    const authz = request.headers.get("authorization") || "";
    const hasAuthHeader = authz.toLowerCase().startsWith("bearer ");
    const cookies = request.cookies;
    const hasAuthCookie = Boolean(
      cookies.get("__Secure-auth-token")?.value ||
        cookies.get("auth-token")?.value ||
        cookies.get("__Secure-next-auth.session-token")?.value ||
        cookies.get("next-auth.session-token")?.value ||
        cookies.get("__Secure-session-token")?.value ||
        cookies.get("session-token")?.value ||
        cookies.get("jwt")?.value
    );
    if (hasAuthHeader || hasAuthCookie) {
      return NextResponse.next();
    }
    // No token present: redirect to sign-in with callback for return
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // For all other routes, pass through; API handlers enforce auth via headers
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
