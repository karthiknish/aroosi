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

  // Always allow framework/system paths through
  if (
    pathname === "/404" ||
    pathname === "/500" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes("__next_static") ||
    pathname.includes("__next_data")
  ) {
    return NextResponse.next();
  }

  // Always allow framework/system paths through
  if (
    pathname === "/404" ||
    pathname === "/500" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes("__next_static") ||
    pathname.includes("__next_data")
  ) {
    return NextResponse.next();
  }

  // Let the framework/system paths pass through
  if (
    pathname === "/404" ||
    pathname === "/500" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes("__next_static") ||
    pathname.includes("__next_data")
  ) {
    return NextResponse.next();
  }

  // Minimal debug line to confirm middleware is reached and for which path
  // This prints on the server console running Next.js
  console.info("[MW] path", pathname);

  // Skip middleware for static files, _next, and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (isPublicApiRoute(pathname)) {
    return NextResponse.next();
  }

  // New: Allow Next.js default 404/500 and unknown routes to fall through to app router
  // so they render 404 instead of being intercepted by auth redirects.
  // Known framework paths that should never be gated:
  if (
    pathname === "/404" ||
    pathname === "/500" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes("__next_static") ||
    pathname.includes("__next_data")
  ) {
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
    return NextResponse.next();
  }

  // SECURITY: Do NOT allow non-JWT "session" cookie for auth gating.
  // Only a verified JWT may pass the middleware.
  // Any presence of aroosi_session is ignored here to prevent spoofing.

  if (!token) {
    // Try refresh flow: if refresh cookie present, allow through to let client refresh
    if (refreshCookie && pathname.startsWith("/api")) {
      // For API requests, pass through and let /api/auth/me or client refresh logic handle it
      return NextResponse.next();
    }
    // Allow first navigation to key authenticated client routes if refresh cookie exists,
    // so client can hydrate and call /api/auth/me to refresh tokens.
    const isAuthenticatedClientRoute =
      pathname === "/search" ||
      pathname.startsWith("/matches") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/usage") ||
      pathname.startsWith("/premium-settings") ||
      pathname.startsWith("/plans");
    if (refreshCookie && isAuthenticatedClientRoute) {
      console.warn(
        "[MW] Allowing navigation without access token due to refresh cookie",
        {
          path: pathname,
        }
      );
      return NextResponse.next();
    }
    // If this is NOT a known protected route, fall through so Next.js can render 404 (unknown paths)
    if (!isKnownProtectedRoute(pathname)) {
      return NextResponse.next();
    }
    // Otherwise redirect to sign-in preserving destination
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    console.warn(
      "[MW] Redirecting due to missing token on protected route",
      {
        path: pathname,
      }
    );
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
  } catch (error) {
    // Invalid or expired access token:
    // If we have a refresh cookie, allow API calls to continue (client will refresh),
    // and for page requests redirect to sign-in with redirect_url.
    const refreshCookie = request.cookies.get("refresh-token")?.value;

    if (refreshCookie && pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    // If NOT a known protected route, fall through so Next.js can render 404 (unknown paths)
    if (!isKnownProtectedRoute(pathname)) {
      return NextResponse.next();
    }

    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", pathname);

    // If refresh cookie exists and this is an authenticated client route, allow through so the client can refresh
    const isAuthenticatedClientRoute =
      pathname === "/search" ||
      pathname.startsWith("/matches") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/usage") ||
      pathname.startsWith("/premium-settings") ||
      pathname.startsWith("/plans");
    if (refreshCookie && isAuthenticatedClientRoute) {
      console.warn(
        "[MW] Access token invalid but refresh present; allowing navigation",
        {
          path: pathname,
        }
      );
      return NextResponse.next();
    }

    const response = NextResponse.redirect(signInUrl);
    response.cookies.delete("auth-token");
    console.warn(
      "[MW] Redirecting due to invalid token on protected route",
      {
        path: pathname,
      }
    );
    return response;
  }
}

export const config = {
  matcher: [
    // Match all routes except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
