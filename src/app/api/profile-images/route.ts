import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  convexQueryWithAuth,
  convexMutationWithAuth,
} from "@/lib/convexServer";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";

// GET /api/profile-images -> get user's profile images
// POST /api/profile-images -> upload profile image metadata
// DELETE /api/profile-images -> delete a profile image (expects JSON body { userId, imageId })

export async function GET(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const { userId } = await requireAuth(request);

    const images = await convexQueryWithAuth(
      request,
      api.images.getProfileImages,
      {
        userId: userId as Id<"users">,
      } as any
    ).catch((e: unknown) => {
      console.error("Profile images GET query error", {
        scope: "profile_images.get",
        type: "convex_query_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return [];
    });
    const response = NextResponse.json(
      { images, correlationId, success: true },
      { status: 200 }
    );

    console.info("Profile images GET success", {
      scope: "profile_images.get",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      count: Array.isArray(images) ? images.length : 0,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Profile images GET unhandled error", {
      scope: "profile_images.get",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to fetch profile images", correlationId },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const { userId } = await requireAuth(req);

    let body: { imageId?: string } = {};
    try {
      body = await req.json();
    } catch {}
    const { imageId } = body;
    if (!imageId) {
      return NextResponse.json(
        { error: "Missing imageId", correlationId },
        { status: 400 }
      );
    }

    const result = await convexMutationWithAuth(
      req,
      api.images.deleteProfileImage,
      {
        userId: userId as Id<"users">,
        imageId: imageId as Id<"_storage">,
      } as any
    ).catch((e: unknown) => {
      console.error("Profile images DELETE mutation error", {
        scope: "profile_images.delete",
        type: "convex_mutation_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return { success: false, message: "Delete failed" } as {
        success: boolean;
        message?: string;
      };
    });
    if (result && (result as { success?: boolean }).success) {
      const response = NextResponse.json(
        { success: true, correlationId },
        { status: 200 }
      );
      console.info("Profile images DELETE success", {
        scope: "profile_images.delete",
        type: "success",
        correlationId,
        statusCode: 200,
        durationMs: Date.now() - startedAt,
      });
      return response;
    }
    return NextResponse.json(
      {
        error:
          (result as { message?: string }).message || "Failed to delete image",
        correlationId,
      },
      { status: 400 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Profile images DELETE unhandled error", {
      scope: "profile_images.delete",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to delete image", correlationId },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const { userId } = await requireAuth(req);

    let body: {
      storageId?: string;
      fileName?: string;
      contentType?: string;
      fileSize?: number;
    } = {};
    try {
      body = await req.json();
    } catch {}

    const { storageId, fileName, contentType, fileSize } = body;
    if (!storageId || !fileName || !contentType || !fileSize) {
      return NextResponse.json(
        { error: "Missing required fields", correlationId },
        { status: 400 }
      );
    }

    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    const MAX_IMAGES_PER_USER = 5;

    if (!ALLOWED_TYPES.includes(contentType as string)) {
      return NextResponse.json(
        { error: "Unsupported image type", correlationId },
        { status: 400 }
      );
    }
    if (typeof fileSize !== "number" || fileSize > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Max 5MB allowed.", correlationId },
        { status: 400 }
      );
    }

    const existingImages = await convexQueryWithAuth(
      req,
      api.images.getProfileImages,
      {
        userId: userId as Id<"users">,
      } as any
    ).catch((e: unknown) => {
      console.error("Profile images POST getProfileImages error", {
        scope: "profile_images.post",
        type: "convex_query_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return [] as unknown[];
    });
    if (
      Array.isArray(existingImages) &&
      existingImages.length >= MAX_IMAGES_PER_USER
    ) {
      return NextResponse.json(
        {
          error: `You can only display up to ${MAX_IMAGES_PER_USER} images on your profile`,
          correlationId,
        },
        { status: 400 }
      );
    }

    const result = await convexMutationWithAuth(
      req,
      api.images.uploadProfileImage,
      {
        userId: userId as Id<"users">,
        storageId: storageId as Id<"_storage">,
        fileName,
        contentType,
        fileSize,
      } as any
    ).catch((e: unknown) => {
      console.error("Profile images POST upload error", {
        scope: "profile_images.post",
        type: "convex_mutation_error",
        message: e instanceof Error ? e.message : String(e),
        correlationId,
        statusCode: 500,
        durationMs: Date.now() - startedAt,
      });
      return null;
    });
    if (
      !result ||
      typeof result !== "object" ||
      (result as { success?: boolean }).success !== true
    ) {
      return NextResponse.json(
        {
          error:
            (result as { message?: string })?.message || "Upload failed",
          correlationId,
        },
        { status: 400 }
      );
    }
    const response = NextResponse.json(
      { ...(result as object), correlationId, success: true },
      { status: 200 }
    );
    console.info("Profile images POST success", {
      scope: "profile_images.post",
      type: "success",
      correlationId,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Profile images POST unhandled error", {
      scope: "profile_images.post",
      type: "unhandled_error",
      message,
      correlationId,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: "Failed to upload image", correlationId },
      { status: 500 }
    );
  }
}
