import { NextRequest, NextResponse } from "next/server";
import { JWTUtils } from "./lib/utils/jwt";

// Define public routes that don't require authentication
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
  "/blog(.*)",
  "/contact",
  "/api/auth(.*)",
  "/api/webhook(.*)",
  "/verify-email(.*)",
  "/reset-password(.*)",
  "/forgot-password(.*)",
];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (
    publicRoutes.some((route) =>
      route.endsWith("(.*)")
        ? new RegExp(`^${route.replace("(.*)", ".*")}$`).test(pathname)
        : pathname === route,
    )
  ) {
    return NextResponse.next();
  }

  // Get session token from cookie
  const sessionToken = request.cookies.get('session')?.value;

  // If no session token, redirect to sign-in
  if (!sessionToken) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Verify session token
  const payload = JWTUtils.verifySessionToken(sessionToken);
  if (!payload) {
    // Invalid token, redirect to sign-in
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    
    // Clear invalid session cookie
    const response = NextResponse.redirect(signInUrl);
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });
    
    return response;
  }

  // Check if token is expired
  if (JWTUtils.isTokenExpired(sessionToken)) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", pathname);
    
    // Clear expired session cookie
    const response = NextResponse.redirect(signInUrl);
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });
    
    return response;
  }

  // Let client-side ProtectedRoute handle profile and onboarding checks
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and _next
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
