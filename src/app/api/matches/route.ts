import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { requireUserToken } from "@/app/api/_utils/auth";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  try {
    // Cookie-auth alignment: infer current user from session, do not require userId in query

    const authCheck = requireUserToken(req);
    if ("errorResponse" in authCheck) {
      const res = authCheck.errorResponse as NextResponse;
      const status = res.status || 401;
      let body: unknown = { error: "Unauthorized", correlationId };
      try {
        const txt = await res.text();
        body = txt ? { ...JSON.parse(txt), correlationId } : body;
      } catch {}
      console.warn("Matches GET auth failed", {
        scope: "matches.list",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(body, { status });
    }
    const { token } = authCheck;

    const convex = getConvexClient();
    if (!convex) {
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
      // @ts-ignore legacy
      convex.setAuth?.(token);
    } catch {}

    const matches = await convex
      .query(api.users.getMyMatches, {})
      .catch((e: unknown) => {
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
          const res = await convex.query(api.users.getUserPublicProfile, {
            userId: match.userId as Id<"users">,
          });
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
