import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/about',
  '/how-it-works',
  '/privacy',
  '/terms',
  '/faq',
  '/contact',
  '/api(.*)',
];

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  
  // Skip middleware for public routes
  if (publicRoutes.some(route => 
    route.endsWith('(.*)') 
      ? new RegExp(`^${route.replace('(.*)', '.*')}$`).test(pathname)
      : pathname === route
  )) {
    return NextResponse.next();
  }

  // Get auth state
  const { userId } = await auth();

  // If user is not signed in, redirect to sign-in
  if (!userId) {
    // Don't redirect if we're already on the sign-in page to prevent loops
    if (pathname.startsWith('/sign-in')) {
      return NextResponse.next();
    }
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Let client-side ProtectedRoute handle profile and onboarding checks
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files and _next
    '/((?!_next|.*\\..*).*)',
    '/(api|trpc)(.*)',
  ],
};
