import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1] || null;
    if (!token) {
      console.warn("Profile images BATCH GET auth failed", {
        scope: "profile_images.batch_get",
        type: "auth_failed",
        correlationId,
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Unauthorized", correlationId },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const userIdsParam = url.searchParams.get("userIds");
    if (!userIdsParam) {
      console.warn("Profile images BATCH GET missing userIds", {
        scope: "profile_images.batch_get",
        type: "validation_error",
        correlationId,
        statusCode: 400,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Missing userIds", correlationId },
        { status: 400 }
      );
    }

    const userIds = userIdsParam
      .split(",")
      .map((id) => id.trim()) as Id<"users">[];

    const convex = getConvexClient();
    if (!convex) {
      console.error("Profile images BATCH GET convex not configured", {
        scope: "profile_images.batch_get",
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

    const result = await convex
      .query(api.images.batchGetProfileImages, {
        userIds,
      })
      .catch((e: unknown) => {
        console.error("/api/profile-images/batch GET query error", {
          scope: "profile_images.batch_get",
          type: "convex_query_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to fetch images", correlationId },
        { status: 500 }
      );
    }

    console.info("Profile images BATCH GET success", {
      scope: "profile_images.batch_get",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      count: Array.isArray(result) ? result.length : undefined,
    });
    return NextResponse.json({ data: result, correlationId, success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("/api/profile-images/batch GET unhandled error", {
      scope: "profile_images.batch_get",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to fetch images", correlationId },
      { status: 500 }
    );
  }
}
