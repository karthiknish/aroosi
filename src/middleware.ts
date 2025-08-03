import { NextRequest, NextResponse } from "next/server";
import { verifyAccessJWT, extractTokenFromHeader } from "@/lib/auth/jwt";

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

  // For protected routes, check authentication
  const authHeader = request.headers.get("authorization");
  const accessCookie = request.cookies.get("auth-token")?.value;
  const refreshCookie = request.cookies.get("refresh-token")?.value;

  // Try to get token from Authorization header or cookie
  // NOTE: localStorage tokens are NOT accessible to the middleware.
  const token = extractTokenFromHeader(authHeader) || accessCookie;

  // SPECIAL CASE: If we have a refresh cookie but no access token,
  // allow first navigation to authenticated client routes so the app can refresh via /api/auth/me.
  const isAuthenticatedClientRoute =
    pathname === "/search" ||
    pathname.startsWith("/matches") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/usage") ||
    pathname.startsWith("/premium-settings") ||
    pathname.startsWith("/plans");
  if (!token && refreshCookie && isAuthenticatedClientRoute) {
    console.info("MW allow refresh navigation", {
      scope: "auth.middleware",
      decision: "allow_refresh_nav",
      path: pathname,
    });
    return NextResponse.next();
  }

  // SECURITY: Do NOT allow non-JWT "session" cookie for auth gating.

  if (!token) {
    // Try refresh flow: if refresh cookie present, allow through to let client refresh (API only)
    if (refreshCookie && pathname.startsWith("/api")) {
      console.info("MW allow API with refresh cookie", {
        scope: "auth.middleware",
        decision: "allow_api_refresh",
        path: pathname,
      });
      return NextResponse.next();
    }

    // If this is NOT a known protected route, fall through so Next.js can render 404 (unknown paths)
    if (!isKnownProtectedRoute(pathname)) {
      console.info("MW pass unknown non-protected", {
        scope: "auth.middleware",
        decision: "pass_unknown",
        path: pathname,
      });
      return NextResponse.next();
    }

    // Otherwise redirect to sign-in preserving destination
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    console.warn("MW redirect missing token", {
      scope: "auth.middleware",
      decision: "redirect_missing_token",
      path: pathname,
    });
    return NextResponse.redirect(signInUrl);
  }

  try {
    // Verify access JWT token
    const payload = await verifyAccessJWT(token);

    // Token is valid, add user info to headers for API routes
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.userId);
    response.headers.set("x-user-email", payload.email);
    response.headers.set("x-user-role", payload.role || "user");

    return response;
  } catch {
    // Invalid or expired access token:
    const refreshCookiePresent = request.cookies.get("refresh-token")?.value;

    if (refreshCookiePresent && pathname.startsWith("/api")) {
      console.info("MW allow API on invalid token with refresh", {
        scope: "auth.middleware",
        decision: "allow_api_invalid_with_refresh",
        path: pathname,
      });
      return NextResponse.next();
    }

    // If NOT a known protected route, fall through so Next.js can render 404 (unknown paths)
    if (!isKnownProtectedRoute(pathname)) {
      console.info("MW pass unknown non-protected (invalid token)", {
        scope: "auth.middleware",
        decision: "pass_unknown_invalid",
        path: pathname,
      });
      return NextResponse.next();
    }

    // If refresh cookie exists and this is an authenticated client route, allow through so the client can refresh
    if (refreshCookiePresent && isAuthenticatedClientRoute) {
      console.warn("MW allow nav invalid token with refresh", {
        scope: "auth.middleware",
        decision: "allow_nav_invalid_with_refresh",
        path: pathname,
      });
      return NextResponse.next();
    }

    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", pathname);

    const response = NextResponse.redirect(signInUrl);
    response.cookies.delete("auth-token");
    console.warn("MW redirect invalid token", {
      scope: "auth.middleware",
      decision: "redirect_invalid_token",
      path: pathname,
    });
    return response;
  }
}

export const config = {
  matcher: [
    // Match all routes except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
