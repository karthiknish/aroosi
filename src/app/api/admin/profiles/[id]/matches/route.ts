import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { requireAdminSession, devLog } from "@/app/api/_utils/auth";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const adminCheck = await requireAdminSession(req);
  if ("errorResponse" in adminCheck) {
    const status = 403;
    const body = { error: "Unauthorized", correlationId };
    devLog("warn", "admin.profile_matches", "auth_failed", { correlationId, statusCode: status, durationMs: Date.now() - startedAt });
    return NextResponse.json(body, { status });
  }

  try {
    const profileId = req.nextUrl.pathname.split("/").slice(-2)[0] as string;
    const matches = await fetchQuery(
      api.users.getMatchesForProfile,
      { profileId: profileId as Id<"profiles"> } as any
    ).catch((e: unknown) => {
      devLog("error", "admin.profile_matches", "convex_query_error", { message: e instanceof Error ? e.message : String(e), correlationId, statusCode: 500, durationMs: Date.now() - startedAt });
      return null;
    });

    if (!matches) {
      return NextResponse.json(
        { error: "Failed", correlationId },
        { status: 500 }
      );
    }

    devLog("info", "admin.profile_matches", "success", { correlationId, statusCode: 200, durationMs: Date.now() - startedAt });
    return NextResponse.json({ success: true, matches, correlationId }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    devLog("error", "admin.profile_matches", "unhandled_error", { message, correlationId, statusCode: 500, durationMs: Date.now() - startedAt });
    return NextResponse.json({ error: "Failed", correlationId }, { status: 500 });
  }
}
