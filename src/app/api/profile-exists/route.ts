import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";

export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get("email");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { success: false, error: "Invalid email" },
      { status: 400 }
    );
  }

  try {
    const convex = getConvexClient();
    if (!convex)
      return NextResponse.json(
        { success: false, error: "Server" },
        { status: 500 }
      );

    // Look up user by email (case-insensitive)
    const user = await convex.query(api.users.getUserByEmail, {
      email: email.toLowerCase(),
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        exists: false,
        hasProfile: false,
      });
    }

    const profile = await convex.query(api.profiles.getProfileByUserId, {
      userId: user._id as Id<"users">,
    });

    return NextResponse.json({
      success: true,
      exists: true,
      hasProfile: Boolean(profile && profile.isProfileComplete),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed" },
      { status: 500 }
    );
  }
}
