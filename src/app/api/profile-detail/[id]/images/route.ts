import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireAuth, AuthError } from "@/lib/auth/requireAuth";

// Add debug logging
const debug = process.env.NODE_ENV === "development";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const requestId = Math.random().toString(36).substring(2, 9);

  const log = (message: string, data?: unknown) => {
    if (debug) {
      console.log(
        `[${new Date().toISOString()}] [${requestId}] ${message}`,
        data || ""
      );
    }
  };

  try {
    log("Processing request", { path: url.pathname });

    await requireAuth(req);

    // Get the ID from the URL
    const segments = url.pathname.split("/").filter(Boolean);
    const idIndex = segments.indexOf("profile-detail") + 1;
    const id = segments[idIndex];

    if (!id) {
      log("No ID found in URL", { segments, pathname: url.pathname });
      return NextResponse.json(
        {
          error: "Profile or user ID is required",
          requestId,
          details: `URL path format should be /api/profile-detail/[id]/images`,
        },
        { status: 400 }
      );
    }

    // Validate ID format (Firestore auto IDs are 20 chars mixed case, allow broader range)
    // Firestore auto IDs are 20 chars (mixed case + digits); allow a reasonable range 6-40.
    // NOTE: Previous regex had spaces in the quantifier and rejected all valid IDs.
    const isValidId = /^[A-Za-z0-9_-]{6,40}$/.test(id);
    if (!isValidId) {
      log("Invalid ID format", { id });
      return NextResponse.json(
        {
          error: "Invalid ID format",
          requestId,
          details:
            "ID must be 6-40 chars: letters, numbers, underscore or dash (Firestore style)",
        },
        { status: 400 }
      );
    }

    log("Fetching profile details", { profileId: id });

    let resolvedUserId: string | null = null;
    let images: unknown[] = [];

    try {
      // Only try getProfileById if the id is likely a profileId (e.g., if you have a prefix or length check, use it here)
      // Otherwise, skip to getUserPublicProfile
      // We only use user docs in Firestore; treat id as userId directly
      const userDoc = await db.collection("users").doc(id).get();
      if (userDoc.exists) {
        resolvedUserId = id;
        log("Found user by ID", { userId: resolvedUserId });
      }

      // If we still don't have a user ID, return 404
      if (!resolvedUserId) {
        log("No user or profile found with ID", { id });
        return NextResponse.json(
          {
            error: "User or profile not found",
            requestId,
            details: "The provided ID does not match any user or profile",
          },
          { status: 404 }
        );
      }

      // Get profile images using the resolved user ID
      try {
        if (!resolvedUserId) {
          // Extra safety net for type checker; logic above already 404s if missing
          return NextResponse.json(
            { error: "User or profile not found", requestId },
            { status: 404 }
          );
        }
        const u = await db.collection("users").doc(resolvedUserId).get();
        const data = u.exists ? (u.data() as any) : {};
        const ids: string[] = Array.isArray(data.profileImageIds)
          ? data.profileImageIds
          : [];
        const urls: string[] = Array.isArray(data.profileImageUrls)
          ? data.profileImageUrls
          : [];
        images = ids.length
          ? ids.map((id: string, i: number) => ({ id, url: urls[i] || null }))
          : urls.map((url: string, i: number) => ({
              id: `${resolvedUserId}_${i}`,
              url,
            }));
        log("Fetched profile images", { count: images.length });
      } catch (queryError) {
        log("Error in getProfileImages query", {
          error: String(queryError),
          userId: String(resolvedUserId),
        });
        throw new Error(
          `Failed to fetch images: ${queryError instanceof Error ? queryError.message : "Unknown error"}`
        );
      }
    } catch (error) {
      log("Error fetching profile images", { error: String(error) });
      return NextResponse.json(
        {
          error: "Failed to fetch profile images",
          requestId,
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    log("Request completed successfully", { duration: `${duration}ms` });

    // Normalize: guarantee each image has a url. If missing, construct from bucket + storageId/id.
    // Be defensive: adminStorage.bucket() will throw if no default bucket was configured when
    // initializing firebase-admin. Prefer explicit env vars or derived project bucket names.
    const adminMod = await import("@/lib/firebaseAdmin");
    const adminStorage = adminMod.adminStorage;
    let bucketName: string | undefined;
    try {
      // Try to read the default bucket configured on the admin SDK (may throw if unset)
      const defaultBucket =
        typeof adminStorage.bucket === "function"
          ? adminStorage.bucket()
          : undefined;
      if (defaultBucket && (defaultBucket as any).name) {
        bucketName = (defaultBucket as any).name;
      }
    } catch (e) {
      // No default bucket configured; we'll fall back to env-derived names below.
      if (debug)
        console.warn(
          `[${requestId}] adminStorage has no default bucket:`,
          (e as Error).message
        );
    }

    // Env fallbacks (common in local/dev): explicit bucket env or public NEXT envs used by client
    bucketName =
      bucketName ||
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      (process.env.GCLOUD_PROJECT
        ? `${process.env.GCLOUD_PROJECT}.appspot.com`
        : undefined) ||
      (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
        ? `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`
        : undefined);

    const normalized = await Promise.all(
      (images as any[]).map(async (img) => {
        const storageId = img.storageId || img.id || null;
        let url = img.url || null;
        if (!url && storageId && bucketName) {
          try {
            const file = adminStorage.bucket(bucketName).file(storageId);
            // Generate a signed URL valid for 1 hour
            const [signedUrl] = await file.getSignedUrl({
              action: "read",
              expires: Date.now() + 60 * 60 * 1000, // 1 hour
            });
            url = signedUrl;
          } catch (e) {
            if (debug)
              console.warn(
                `[${requestId}] Failed to sign URL for ${storageId}:`,
                e
              );
            // Fallback to public URL if signing fails
            url = `https://storage.googleapis.com/${bucketName}/${storageId}`;
          }
        }
        return { id: storageId || img.id, storageId, url };
      })
    );
    return NextResponse.json(
      {
        success: true,
        userProfileImages: normalized,
        count: normalized.length,
        requestId,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          "X-Request-ID": requestId,
          "X-Response-Time": `${duration}ms`,
        },
      }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`[${requestId}] Error in profile images API:`, {
      error: errorMessage,
      stack: errorStack,
      duration: `${duration}ms`,
      url: url.toString(),
    });

    return NextResponse.json(
      {
        error: "An unexpected error occurred",
        requestId,
        ...(debug
          ? {
              details: errorMessage,
              stack: errorStack,
            }
          : {}),
      },
      {
        status: 500,
        headers: {
          "X-Request-ID": requestId,
          "X-Response-Time": `${duration}ms`,
        },
      }
    );
  }
}
