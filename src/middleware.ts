import { NextRequest, NextResponse } from "next/server";
// Cookie-only model: remove JWT header parsing entirely

// Define public routes that don't require authentication
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
  "/verify-otp",
  "/oauth",
];

// Define API routes that don't require authentication
const publicApiRoutes = [
  "/api/auth",
  "/api/contact",
  "/api/blog",
  "/api/stripe/webhook",
];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => {
    if (route === "/blog" && pathname.startsWith("/blog")) return true;
    // auth API routes are handled separately; do not mix here
    return pathname === route;
  });
}

// Single definition: only these are protected. Unknown paths should fall through (404).
function isKnownProtectedRoute(pathname: string): boolean {
  // Canonical single definition: only these are protected.
  // Unknown paths should NOT be treated as protected (let App Router render 404).
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

// Only these routes are considered protected; unknown paths should fall through (404)

// Treat unknown, non-protected paths as public so App Router can render 404

function isPublicApiRoute(pathname: string): boolean {
  return publicApiRoutes.some((route) => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Single system path guard
  const isSystemPath =
    pathname === "/404" ||
    pathname === "/500" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes("__next_static") ||
    pathname.includes("__next_data");
  if (isSystemPath) {
    return NextResponse.next();
  }

  // Minimal structured trace (kept lightweight)
  console.info("MW pass-through", { scope: "auth.middleware", path: pathname });

  // Skip middleware for static files, _next, and favicon (dot files/assets)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Public API routes
  if (isPublicApiRoute(pathname)) {
    return NextResponse.next();
  }

  // Pure token model: do not read cookies. Do not enforce auth here.
  // Let pages hit /api/auth/me (with Authorization header) to resolve session.
  // Keep optional guard by Authorization header heuristic on known authenticated routes.
  const isAuthenticatedClientRoute =
    pathname === "/search" ||
    pathname.startsWith("/matches") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/usage") ||
    pathname.startsWith("/premium-settings") ||
    pathname.startsWith("/plans") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/(authenticated)");

  if (isAuthenticatedClientRoute) {
    const authz = request.headers.get("authorization") || "";
    if (authz.toLowerCase().startsWith("bearer ")) {
      return NextResponse.next();
    }
    // No Authorization header: allow through. The page will call /api/auth/me and handle 401.
    return NextResponse.next();
  }

  // For API and other routes, pass through. Auth is enforced in the handlers.
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
