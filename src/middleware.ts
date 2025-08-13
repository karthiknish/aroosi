import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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
  "/oauth",
  "/oauth/callback",
  "/sso-callback",
];

// Public API route prefixes (auth handled per-handler)
const publicApiRoutes = [
  "/api/auth", // sign-in, sign-up, refresh, logout, etc.
  "/api/contact",
  "/api/blog",
  "/api/stripe/webhook",
];

const isPublicRoute = createRouteMatcher(publicRoutes);
const isPublicApiRoute = createRouteMatcher(publicApiRoutes);

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

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  // Always allow public pages and public API routes
  if (isPublicRoute(request) || isPublicApiRoute(request)) {
    return;
  }

  // For authenticated client routes, protect with Clerk
  if (isAuthenticatedClientRoute(pathname)) {
    const authObj = await auth();
    const { userId } = authObj;
    
    // If user is not authenticated, redirect to sign-in
    if (!userId) {
      return authObj.redirectToSignIn();
    }
    
    // For routes that require profile completion, we could add additional checks here
    // For now, we'll let the client-side components handle profile completion redirects
    return;
  }
});

export const config = {
  matcher: [
    // Match all routes except static files and _next
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};