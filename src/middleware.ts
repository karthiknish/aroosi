import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, extractTokenFromHeader } from "@/lib/auth/jwt";

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
    if (route === "/api/auth" && pathname.startsWith("/api/auth")) return true;
    return pathname === route;
  });
}

function isPublicApiRoute(pathname: string): boolean {
  return publicApiRoutes.some((route) => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // For protected routes, check authentication
  const authHeader = request.headers.get("authorization");
  const jwtCookie = request.cookies.get("auth-token")?.value;
  const sessionCookie = request.cookies.get("aroosi_session")?.value;

  // Try to get token from Authorization header or cookie
  // NOTE: localStorage tokens are NOT accessible to the middleware.
  // Ensure the auth-token is also set as an HttpOnly cookie by the server at sign-in.
  const token = extractTokenFromHeader(authHeader) || jwtCookie;

  // If no JWT token, allow cookie session created during signup
  if (!token && sessionCookie) {
    // Best-effort decode of light session cookie to gate navigation
    try {
      const decoded = JSON.parse(
        Buffer.from(sessionCookie, "base64url").toString("utf8")
      ) as { email?: string; userId?: string };
      if (decoded?.email || decoded?.userId) {
        // Consider authenticated for navigation purposes; /api/auth/me will hydrate full user
        return NextResponse.next();
      }
    } catch {
      // fall through to redirect
    }
  }

  if (!token) {
    // No token or valid session cookie; redirect to sign-in
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signInUrl);
  }

  try {
    // Verify JWT token
    const payload = await verifyJWT(token);

    // Token is valid, add user info to headers for API routes
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.userId);
    response.headers.set("x-user-email", payload.email);
    response.headers.set("x-user-role", payload.role || "user");

    return response;
  } catch (error) {
    // Invalid token, but if we have a valid-looking session cookie, allow and let client hydrate
    if (sessionCookie) {
      try {
        const decoded = JSON.parse(
          Buffer.from(sessionCookie, "base64url").toString("utf8")
        ) as { email?: string; userId?: string };
        if (decoded?.email || decoded?.userId) {
          return NextResponse.next();
        }
      } catch {
        // ignore
      }
    }

    // Otherwise redirect to sign-in
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    const response = NextResponse.redirect(signInUrl);

    // Clear invalid token cookie
    response.cookies.delete("auth-token");

    return response;
  }
}

export const config = {
  matcher: [
    // Match all routes except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
