import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { Profile } from "../../../../../convex/users";

function getTokenFromRequest(req: NextRequest): {
  token: string | null;
  error?: string;
} {
  try {
    const auth = req.headers.get("authorization");
    if (!auth) return { token: null, error: "No authorization header" };
    const [type, token] = auth.split(" ");
    if (type !== "Bearer") return { token: null, error: "Invalid token type" };
    if (!token) return { token: null, error: "No token provided" };
    return { token };
  } catch (error) {
    return {
      token: null,
      error: error instanceof Error ? error.message : "Failed to process token",
    };
  }
}

export async function GET(req: NextRequest) {
  const { token, error: tokenError } = getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Authentication failed", details: tokenError },
      { status: 401 }
    );
  }
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
