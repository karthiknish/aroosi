import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getUserEmailServer, getUserFullNameServer } from "@/lib/clerkServerApi";

// Return current user with profile using Clerk authentication
export async function GET(_request: Request) {
  try {
    // Get the session token from Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Get full user data from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Create Convex client
    const _convex = new ConvexHttpClient(
      process.env.NEXT_PUBLIC_CONVEX_URL!
    );

    // Get the user data from Convex using Clerk user ID
    const convexUser = await fetchQuery(api.users.getUserByClerkId, { clerkId: userId });
    
    // If user doesn't exist in Convex, we can still return Clerk data
    if (!convexUser) {
      // Enhance user data with Clerk information
      const userEmail = await getUserEmailServer();
      const userFullName = await getUserFullNameServer();
      
      return NextResponse.json(
        {
          user: {
            id: userId,
            email: userEmail || clerkUser.emailAddresses[0]?.emailAddress || "",
            role: "user",
            emailVerified: clerkUser.emailAddresses.some(e => e.verification?.status === "verified"),
            createdAt: clerkUser.createdAt,
            fullName: userFullName || clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || undefined,
            profile: null,
          },
        },
        { status: 200 }
      );
    }
    
    // If user exists in Convex, get their profile
    // @ts-expect-error - Type mismatch between generated types and runtime response
    const data = await fetchQuery(api.users.getCurrentUserWithProfile, { userId: convexUser._id });
    if (!data) return NextResponse.json({ user: null }, { status: 200 });
    const user = data.user;
    const profile = data.profile;
    
    // Enhance user data with Clerk information
    const userEmail = await getUserEmailServer();
    const userFullName = await getUserFullNameServer();
    
    return NextResponse.json(
      {
        user: {
          id: String(user?._id ?? userId),
          email: String(user?.email ?? userEmail ?? clerkUser.emailAddresses[0]?.emailAddress ?? ""),
          role: String(user?.role ?? "user"),
          emailVerified: Boolean(user?.emailVerified ?? clerkUser.emailAddresses.some(e => e.verification?.status === "verified")),
          createdAt: Number(user?.createdAt ?? clerkUser.createdAt),
          fullName: userFullName || clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || undefined,
          profile: profile
            ? {
                id: String(profile?._id ?? ""),
                fullName: profile?.fullName ?? userFullName ?? undefined,
                isProfileComplete: Boolean(profile?.isProfileComplete ?? false),
                isOnboardingComplete: Boolean(profile?.isOnboardingComplete ?? false),
              }
            : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
