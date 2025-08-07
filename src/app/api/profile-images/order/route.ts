import { NextRequest, NextResponse } from "next/server";
import { Id } from "@convex/_generated/dataModel";
import { AuthError, authErrorResponse, requireAuth } from "@/lib/auth/requireAuth";
import { convexMutationWithAuth } from "@/lib/convexServer";

export async function POST(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    try {
      await requireAuth(req);
    } catch (e) {
      if (e instanceof AuthError) {
        return authErrorResponse(e.message, { status: e.status, code: e.code });
      }
      return authErrorResponse("Authentication failed", {
        status: 401,
        code: "ACCESS_INVALID",
      });
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

    const result = await convexMutationWithAuth(
      req,
      (await import("@convex/_generated/api")).api.images.updateProfileImageOrder,
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

    if ((result as any).success) {
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
      { error: (result as any).message || "Failed to update order", correlationId },
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
