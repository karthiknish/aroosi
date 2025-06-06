import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Missing userId parameter" },
      { status: 400 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);

  try {
    // Get all matches for this user
    const matches = (await convex.query(api.users.getMyMatches, {})) as Array<{
      userId: string;
    }>;
    // matches is an array of profile objects with userId field
    // For each, fetch the public profile
    const results = await Promise.all(
      matches.map(async (profile) => {
        try {
          const res = await convex.query(api.users.getUserPublicProfile, {
            userId: profile.userId as Id<"users">,
          });
          if (res && res.profile) {
            return { userId: profile.userId, profile: res.profile };
          }
        } catch {}
        return null;
      })
    );
    return NextResponse.json(results.filter(Boolean), { status: 200 });
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
