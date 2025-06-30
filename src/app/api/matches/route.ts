import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { requireUserToken } from "@/app/api/_utils/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Missing userId parameter" },
      { status: 400 }
    );
  }

  const authCheck = requireUserToken(req);
  if ("errorResponse" in authCheck) return authCheck.errorResponse;
  const { token } = authCheck;

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
  convex.setAuth(token);

  try {
    // Get all matches for this user
    const matches = (await convex.query(api.users.getMyMatches, {})) as Array<{
      userId: string;
    }>;
    // matches is an array of profile objects with userId field
    // For each, fetch the public profile
    const results = await Promise.all(
      matches.map(async (match) => {
        try {
          const res = await convex.query(api.users.getUserPublicProfile, {
            userId: match.userId as Id<"users">,
          });
          if (res && res.profile) {
            // ensure userId is included on the returned profile for convenience
            return { ...res.profile, userId: match.userId };
          }
        } catch (e) {
          console.error(
            "[matches API] Error fetching profile for",
            match.userId,
            e
          );
        }
        return null;
      })
    );
    // Filter nulls and respond with flattened profile array
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
