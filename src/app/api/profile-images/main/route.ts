import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { requireSession } from "@/app/api/_utils/auth";

export async function PUT(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) {
      const res = session.errorResponse as NextResponse;
      const status = res.status || 401;
      let body: unknown = { error: "Unauthorized", correlationId };
      try {
        const txt = await res.text();
        body = txt ? { ...JSON.parse(txt), correlationId } : body;
      } catch {}
      console.warn("Profile images MAIN PUT auth failed", {
        scope: "profile_images.main",
        type: "auth_failed",
        correlationId,
        statusCode: status,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(body, { status });
    }
    const { userId } = session;
    if (!userId) {
      console.warn("Profile images MAIN PUT no userId", {
        scope: "profile_images.main",
        type: "auth_context_missing",
        correlationId,
        statusCode: 401,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "User ID not found in session", correlationId },
        { status: 401 }
      );
    }

    const convex = getConvexClient();
    if (!convex) {
      console.error("Profile images MAIN PUT convex not configured", {
        scope: "profile_images.main",
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
    // Cookie-only: do not set bearer tokens on client
    try {
      // Ensure no legacy calls remain; safe no-op
      // @ts-ignore
      convex.setAuth?.(undefined);
    } catch {}

    const profile = await convex
      .query(api.profiles.getProfileByUserId, {
        userId: userId as Id<"users">,
      })
      .catch((e: unknown) => {
        console.error("Profile images MAIN PUT getProfileByUserId error", {
          scope: "profile_images.main",
          type: "convex_query_error",
          message: e instanceof Error ? e.message : String(e),
          correlationId,
          statusCode: 500,
          durationMs: Date.now() - startedAt,
        });
        return null;
      });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found", correlationId },
        { status: 404 }
      );
    }

    let parsed: unknown;
    try {
      parsed = await request.json();
    } catch {
      console.warn("Profile images MAIN PUT invalid JSON", {
        scope: "profile_images.main",
        type: "validation_error",
        correlationId,
        statusCode: 400,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { error: "Invalid JSON", correlationId },
        { status: 400 }
      );
    }
    const { imageId } = (parsed as { imageId?: string }) || {};
    if (!imageId) {
      return NextResponse.json(
        { error: "Missing imageId", correlationId },
        { status: 400 }
      );
    }

    const profileImages =
      (profile as { profileImageIds?: string[] }).profileImageIds || [];
    if (!profileImages.includes(imageId)) {
      return NextResponse.json(
        { error: "Image not found in user's profile", correlationId },
        { status: 404 }
      );
    }

    const updatedImageOrderStrings = [
      imageId,
      ...profileImages.filter((id: string) => id !== imageId),
    ];
    const updatedImageOrder = updatedImageOrderStrings.map(
      (id) => id as Id<"_storage">
    );

    const result = await convex
      .mutation(api.users.updateProfile, {
        updates: {
          profileImageIds: updatedImageOrder,
          updatedAt: Date.now(),
        },
      })
      .catch((e: unknown) => {
        console.error("Profile images MAIN PUT updateProfile error", {
          scope: "profile_images.main",
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
        { error: "Failed to set main profile image", correlationId },
        { status: 500 }
      );
    }

    console.info("Profile images MAIN PUT success", {
      scope: "profile_images.main",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      {
        success: true,
        message: "Main profile image updated successfully",
        mainImageId: imageId,
        imageOrder: updatedImageOrder,
        correlationId,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Profile images MAIN PUT unhandled error", {
      scope: "profile_images.main",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to set main profile image", correlationId },
      { status: 500 }
    );
  }
}
