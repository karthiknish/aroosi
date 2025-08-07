import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { requireAdminSession, devLog } from "@/app/api/_utils/auth";
import { fetchQuery } from "convex/nextjs";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const adminCheck = await requireAdminSession(req);
  if ("errorResponse" in adminCheck) {
    const status = 403;
    const body = { error: "Admin privileges required", correlationId };
    devLog("warn", "admin.interests", "auth_failed", {
      correlationId,
      statusCode: status,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(body, { status });
  }

  try {
    const result = await fetchQuery(api.interests.listAllInterests, {}).catch((e: unknown) => {
      devLog("error", "admin.interests", "convex_query_error", {
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
        message: e instanceof Error ? e.message : String(e),
      });
      return null;
    });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to fetch interests", correlationId },
        { status: 500 }
      );
    }

    devLog("info", "admin.interests", "success", {
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      count: Array.isArray(result) ? result.length : undefined,
    });
    return NextResponse.json(
      { success: true, interests: result, correlationId },
      { status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    devLog("error", "admin.interests", "unhandled_error", {
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
      message,
    });
    return NextResponse.json(
      { error: "Failed to fetch interests", correlationId },
      { status: 500 }
    );
  }
}
