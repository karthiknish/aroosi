import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";

// Return current user with profile using Convex Auth session
export async function GET() {
  try {
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
