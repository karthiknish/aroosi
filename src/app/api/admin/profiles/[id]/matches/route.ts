import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { requireAdminToken } from "@/app/api/_utils/auth";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const adminCheck = requireAdminToken(req);
  if ("errorResponse" in adminCheck) {
    const res = adminCheck.errorResponse as NextResponse;
    const status = res.status || 401;
    let body: unknown = { error: "Unauthorized", correlationId };
    try {
      const txt = await res.text();
      body = txt ? { ...JSON.parse(txt), correlationId } : body;
    } catch {}
    console.warn("Admin profile matches GET auth failed", {
      scope: "admin.profile_matches",
      type: "auth_failed",
      correlationId,
      statusCode: status,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(body, { status });
  }
  const { token } = adminCheck;

  const convex = getConvexClient();
  if (!convex) {
    console.error("Admin profile matches GET convex not configured", {
      scope: "admin.profile_matches",
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

  try {
    const profileId = req.nextUrl.pathname.split("/").slice(-2)[0] as string;
    const matches = await convex
      .query(api.users.getMatchesForProfile, {
        profileId: profileId as Id<"profiles">,
      })
      .catch((e: unknown) => {
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
