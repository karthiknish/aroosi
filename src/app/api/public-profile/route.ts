import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { convexQueryWithAuth } from "@/lib/convexServer";
import type { Id } from "@convex/_generated/dataModel";

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      console.warn("Public profile GET missing userId", {
        scope: "public_profile.get",
        type: "validation_error",
        correlationId,
        statusCode: 400,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { success: false, error: "Missing userId", correlationId },
        { status: 400 }
      );
    }

    const res = await convexQueryWithAuth(req, api.users.getProfileByUserIdPublic, {
      userId: userId as Id<"users">,
    }).catch((e: unknown) => {
      console.error("Public profile GET query error", {
        scope: "public_profile.get",
        type: "convex_query_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return null as any;
    });

    if (!res) {
      console.info("Public profile GET not found", {
        scope: "public_profile.get",
        type: "not_found",
        correlationId,
        statusCode: 404,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { success: false, error: "Not found", correlationId },
        { status: 404 }
      );
    }

    console.info("Public profile GET success", {
      scope: "public_profile.get",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({
      success: true,
      data: { ...res, userId },
      correlationId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Public profile GET unhandled error", {
      scope: "public_profile.get",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { success: false, error: "Failed", correlationId },
      { status: 500 }
    );
  }
}
