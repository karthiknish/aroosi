// Admin API route for reordering profile images by profileId
import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { requireAdminSession } from "@/app/api/_utils/auth";

export async function POST(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();

  const adminCheck = await requireAdminSession(req);
  if ("errorResponse" in adminCheck) {
    const res = adminCheck.errorResponse as NextResponse;
    const status = res.status || 401;
    let bodyOut: unknown = { error: "Unauthorized", correlationId };
    try {
      const txt = await res.text();
      bodyOut = txt ? { ...JSON.parse(txt), correlationId } : bodyOut;
    } catch {}
    console.warn("Admin profile.images.order POST auth failed", {
      scope: "admin.profile_images_order",
      type: "auth_failed",
      correlationId,
      statusCode: status,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(bodyOut, { status });
  }

  const convex = getConvexClient();
  if (!convex) {
    console.error("Admin profile.images.order POST convex not configured", {
      scope: "admin.profile_images_order",
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    console.warn("Admin profile.images.order POST invalid JSON body", {
      scope: "admin.profile_images_order",
      type: "validation_error",
      correlationId,
      statusCode: 400,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Invalid JSON body", correlationId },
      { status: 400 }
    );
  }
  const { imageIds } = body as { imageIds?: unknown };
  const url = req.nextUrl || new URL(req.url);
  const segments = url.pathname.split("/");
  const profilesIdx = segments.findIndex((s) => s === "profiles");
  const profileId = profilesIdx !== -1 ? segments[profilesIdx + 1] : undefined;
  if (
    !profileId ||
    !Array.isArray(imageIds) ||
    (imageIds as unknown[]).some((id) => typeof id !== "string")
  ) {
    console.warn("Admin profile.images.order POST invalid params", {
      scope: "admin.profile_images_order",
      type: "validation_error",
      correlationId,
      statusCode: 400,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Missing or invalid profileId or imageIds", correlationId },
      { status: 400 }
    );
  }
  try {
    const result = await convex
      .mutation(api.users.adminUpdateProfileImageOrder, {
        profileId: profileId as Id<"profiles">,
        imageIds: (imageIds as string[]).map((id) => id as Id<"_storage">),
      })
      .catch((e: unknown) => {
        console.error("Admin profile.images.order POST mutation error", {
          scope: "admin.profile_images_order",
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
        { error: "Failed to reorder images", correlationId },
        { status: 500 }
      );
    }

    console.info("Admin profile.images.order POST success", {
      scope: "admin.profile_images_order",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      profileId,
      count: (imageIds as string[]).length,
    });
    return NextResponse.json({ success: true, correlationId }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Admin profile.images.order POST unhandled error", {
      scope: "admin.profile_images_order",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to reorder images", correlationId },
      { status: 500 }
    );
  }
}
 