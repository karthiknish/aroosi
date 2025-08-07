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

    // Fetch matches via Convex using cookie/session auth
    const matches = (await convexQueryWithAuth(
      req,
      (await import("@convex/_generated/api")).api.users.getMyMatches,
      {}
    ).catch(() => [])) as Array<{
      userId: string;
      fullName?: string | null;
      profileImageUrls?: string[] | null;
      createdAt?: number | null;
    }>;

    const results = await Promise.all(
      (matches || []).map(async (match) => {
        try {
          // If getMyMatches already returned basic fields, just use them
          const publicProfile = await convexQueryWithAuth(
            req,
            (await import("@convex/_generated/api")).api.users
              .getProfileByUserIdPublic,
            { userId: match.userId as Id<"users"> }
          ).catch(() => null as any);
          const merged = publicProfile || {};
          return {
            userId: match.userId,
            fullName: match.fullName ?? merged.fullName ?? null,
            profileImageUrls:
              match.profileImageUrls ?? merged.profileImageUrls ?? [],
            createdAt: match.createdAt ?? merged.createdAt ?? Date.now(),
          };
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
