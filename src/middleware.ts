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
  const cookieToken = request.cookies.get("auth-token")?.value;

  // Try to get token from Authorization header or cookie
  const token = extractTokenFromHeader(authHeader) || cookieToken;

  if (!token) {
    // No token found, redirect to sign-in
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
    // Invalid token, redirect to sign-in
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
