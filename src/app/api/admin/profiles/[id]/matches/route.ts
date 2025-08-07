import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const { role } = await requireAuth(req);
  if ((role || "user") !== "admin") {
    const status = 403;
    const body = { error: "Unauthorized", correlationId };
    console.warn("Admin profile matches GET auth failed", {
      scope: "admin.profile_matches",
      type: "auth_failed",
      correlationId,
      statusCode: status,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(body, { status });
  }

  try {
    const profileId = req.nextUrl.pathname.split("/").slice(-2)[0] as string;
    const matches = await fetchQuery(
      api.users.getMatchesForProfile,
      { profileId: profileId as Id<"profiles"> } as any
    ).catch((e: unknown) => {
        console.error("Admin profile matches GET query error", {
          scope: "admin.profile_matches",
          type: "convex_query_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      });

    if (!matches) {
      return NextResponse.json(
        { error: "Failed", correlationId },
        { status: 500 }
      );
    }

    console.info("Admin profile matches GET success", {
      scope: "admin.profile_matches",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ success: true, matches, correlationId }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Admin profile matches GET unhandled error", {
      scope: "admin.profile_matches",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: "Failed", correlationId }, { status: 500 });
  }
}
