import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { requireAuth } from "@/lib/auth/requireAuth";
import { fetchQuery } from "convex/nextjs";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const { userId, role } = await requireAuth(req);
  if ((role || "user") !== "admin") {
    const status = 403;
    const body = { error: "Admin privileges required", correlationId };
    console.warn("Admin interests GET auth failed", {
      scope: "admin.interests",
      type: "auth_failed",
      correlationId,
      statusCode: status,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(body, { status });
  }

  try {
    const result = await fetchQuery(api.interests.listAllInterests, {}).catch((e: unknown) => {
        console.error("Admin interests GET query error", {
          scope: "admin.interests",
          type: "convex_query_error",
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

    console.info("Admin interests GET success", {
      scope: "admin.interests",
      type: "success",
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
    console.error("Admin interests GET unhandled error", {
      scope: "admin.interests",
      type: "unhandled_error",
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
