import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchMutation } from "convex/nextjs";
import { Id } from "@convex/_generated/dataModel";

export async function POST(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1] || null;
    if (!token) {
      console.warn("Profile images ORDER auth failed", {
        scope: "profile_images.order",
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

    let body: { profileId?: string; imageIds?: string[] } = {};
    try {
      body = await req.json();
    } catch {}
    const { profileId, imageIds } = body;

    if (!profileId || !Array.isArray(imageIds)) {
      return NextResponse.json(
        { error: "Missing profileId or imageIds", correlationId },
        { status: 400 }
      );
    }

    const result = await fetchMutation(
      api.images.updateProfileImageOrder,
      {
        userId: profileId as Id<"users">,
        imageIds: imageIds as Id<"_storage">[],
      } as any
    ).catch((e: unknown) => {
        console.error("Profile images ORDER mutation error", {
          scope: "profile_images.order",
          type: "convex_mutation_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to update order", correlationId },
        { status: 500 }
      );
    }

    if (result.success) {
      const response = NextResponse.json(
        { success: true, correlationId },
        { status: 200 }
      );
      console.info("Profile images ORDER success", {
        scope: "profile_images.order",
        type: "success",
        correlationId,
        statusCode: 200,
        durationMs: Date.now() - startedAt,
      });
      return response;
    }

    return NextResponse.json(
      { error: result.message || "Failed to update order", correlationId },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("/api/profile-images/order unhandled error", {
      scope: "profile_images.order",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to update order", correlationId },
      { status: 500 }
    );
  }
}
