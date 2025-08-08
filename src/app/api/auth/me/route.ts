import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

// Return current user with profile using Convex Auth session
export async function GET(request: Request) {
  try {
    // Get the session token from cookies
    const cookieHeader = request.headers.get("cookie");
    const cookies = cookieHeader?.split(";").reduce(
      (acc, cookie) => {
        const [name, value] = cookie.trim().split("=");
        acc[name] = value;
        return acc;
      },
      {} as Record<string, string>
    );
    
    const sessionToken = cookies?.["convex-session"];
    if (!sessionToken) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Create Convex client with session token
    const convex = new ConvexHttpClient(
      process.env.NEXT_PUBLIC_CONVEX_URL!
    );
    
    // Set the session token for authenticated requests
    convex.setAuth(sessionToken);

    // Check if user is authenticated
    const isAuthenticated = await convex.query(api.auth.isAuthenticated, {});
    if (!isAuthenticated) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const data = await fetchQuery(api.users.getCurrentUserWithProfile, {});
    if (!data) return NextResponse.json({ user: null }, { status: 200 });
    const user = data.user as any;
    const profile = data.profile as any;
    return NextResponse.json(
      {
        user: {
          id: String(user?._id ?? ""),
          email: String(user?.email ?? ""),
          role: String(user?.role ?? "user"),
          emailVerified: Boolean(user?.emailVerified ?? false),
          createdAt: Number(user?.createdAt ?? 0),
          profile: profile
            ? {
                id: String(profile?._id ?? ""),
                fullName: profile?.fullName ?? undefined,
                isProfileComplete: Boolean(profile?.isProfileComplete ?? false),
                isOnboardingComplete: Boolean(profile?.isOnboardingComplete ?? false),
              }
            : null,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
