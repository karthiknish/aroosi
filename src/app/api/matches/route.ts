import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fetchQuery } from "convex/nextjs";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    // Cookie-auth alignment: infer current user from session, do not require userId in query

    const { userId } = await requireAuth(req);

    // Token model; no convex client

    // Placeholder to keep variables used
    void userId;

    {
      console.error("Matches GET convex not configured", {
        scope: "matches.list",
        type: "convex_not_configured",
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Convex client not configured", correlationId },
        { status: 500 }
      );
    }
    try {
      // Cookie-only model: do not set token on convex client
      // convex.setAuth?.(undefined as unknown as string);
    } catch {}

    const matches = await fetchQuery(api.users.getMyMatches, {}).catch((e: unknown) => {
      console.error("Matches GET getMyMatches error", {
        scope: "matches.list",
        type: "convex_query_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return [] as Array<{ userId: string }>;
    });

    const results = await Promise.all(
      (matches as Array<{ userId: string }>).map(async (match) => {
        try {
          const res = await fetchQuery(api.users.getUserPublicProfile, {
            userId: match.userId as Id<"users">,
          } as any);
          if (res && res.profile) {
            return { ...res.profile, userId: match.userId };
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
    // Return normalized shape
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
