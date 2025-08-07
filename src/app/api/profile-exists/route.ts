import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { convexQueryWithAuth } from "@/lib/convexServer";
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
    // Look up user by email (case-insensitive)
    const user = await convexQueryWithAuth(req, api.users.getUserByEmail, {
      email: email.toLowerCase(),
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        exists: false,
        hasProfile: false,
      });
    }

    const profile = await convexQueryWithAuth(
      req,
      api.profiles.getProfileByUserId,
      {
        userId: user._id as Id<"users">,
      }
    );

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
