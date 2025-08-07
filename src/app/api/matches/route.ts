import { NextRequest, NextResponse } from "next/server";
import { Id } from "@convex/_generated/dataModel";
import { requireSession } from "@/app/api/_utils/auth";
import { convexQueryWithAuth } from "@/lib/convexServer";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    const session = await requireSession(req);
    if ("errorResponse" in session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", correlationId },
        { status: 401 }
      );
    }
    const { userId } = session;

    // If users.getMyMatches is not exposed, fallback to deriving matches from interests or return empty list.
    let matches: Array<{ userId: string }> = [];
    try {
      const apiMod = await import("@convex/_generated/api");
      const fn = (apiMod.api.users as any).getMyMatches;
      if (fn) {
        matches =
          (await convexQueryWithAuth(req, fn, {})) as Array<{ userId: string }>;
      }
    } catch {
      matches = [];
    }

    const results = await Promise.all(
      (matches as Array<{ userId: string }>).map(async (match) => {
        try {
          const publicProfile = await convexQueryWithAuth(
            req,
            (await import("@convex/_generated/api")).api.users
              .getProfileByUserIdPublic,
            { userId: match.userId as Id<"users"> }
          );
          if (publicProfile) {
            return { ...publicProfile, userId: match.userId };
          }
        } catch (e) {
          console.error("[matches API] Error fetching profile", {
            scope: "matches.list",
            type: "convex_query_error",
            targetUserId: match.userId,
            message: e instanceof Error ? e.message : String(e),
            correlationId,
            statusCode: 500,
            durationMs: Date.now() - startedAt,
          });
        }
        return null;
      })
    );

    const data = results.filter(Boolean);
    console.info("Matches GET success", {
      scope: "matches.list",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      count: data.length,
    });

    return NextResponse.json(
      { success: true, matches: data, correlationId },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Matches GET unhandled error", {
      scope: "matches.list",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { success: false, error: "Failed to fetch matches", correlationId },
      { status: 500 }
    );
  }
}
