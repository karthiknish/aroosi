import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { Profile } from "@convex/users";
import { requireAdminToken } from "@/app/api/_utils/auth";

export async function GET(req: NextRequest) {
  const adminCheck = requireAdminToken(req);
  if ("errorResponse" in adminCheck) {
    return adminCheck.errorResponse;
  }
  const { token } = adminCheck;
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);

  try {
    // Get all profiles
    const profiles = await convex.query(api.users.adminListProfiles, {
      page: 1,
      pageSize: 10000,
    });
    const allProfiles: Profile[] = profiles.profiles || [];
    // For each profile, get their matches (admin query)
    const allMatches = await Promise.all(
      allProfiles.map(async (profile: Profile) => {
        try {
          const matches = await convex.query(api.users.getMatchesForProfile, {
            profileId: profile._id,
          });
          return { profileId: profile._id, matches };
        } catch {
          return {
            profileId: profile._id,
            matches: [],
            error: "Failed to fetch matches",
          };
        }
      })
    );
    return NextResponse.json(
      { success: true, matches: allMatches },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch matches",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
