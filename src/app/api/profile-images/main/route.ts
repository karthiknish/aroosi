import { NextRequest, NextResponse } from "next/server";
import { Id } from "@convex/_generated/dataModel";
import { requireAuth, AuthError, authErrorResponse } from "@/lib/auth/requireAuth";
import { convexQueryWithAuth, convexMutationWithAuth } from "@/lib/convexServer";

export async function PUT(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    try {
      await requireAuth(request);
    } catch (e) {
      if (e instanceof AuthError) {
        return authErrorResponse(e.message, { status: e.status, code: e.code });
      }
      return authErrorResponse("Authentication failed", {
        status: 401,
        code: "ACCESS_INVALID",
      });
    }
    const { userId } = await requireAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in session", correlationId },
        { status: 401 }
      );
    }

    const profile = await convexQueryWithAuth(
      request,
      (await import("@convex/_generated/api")).api.profiles.getProfileByUserId,
      { userId: userId as Id<"users"> }
    ).catch((e: unknown) => {
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

    const result = await convexMutationWithAuth(
      request,
      (await import("@convex/_generated/api")).api.profiles.updateProfileFields,
      {
        userId: userId as Id<"users">,
        updates: {
          profileImageIds: updatedImageOrder,
          updatedAt: Date.now(),
        },
      } as any
    ).catch((e: unknown) => {
      console.error("Profile images MAIN PUT updateProfileFields error", {
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
