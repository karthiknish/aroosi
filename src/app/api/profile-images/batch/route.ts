import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebaseAdminInit";
import { db } from "@/lib/firebaseAdmin";

// Public-ish batch endpoint (no auth) returning a mapping of userId -> first image URL (or null)

export async function GET(req: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  const startedAt = Date.now();
  try {
    const url = new URL(req.url);
    const userIdsParam = url.searchParams.get("userIds");
    if (!userIdsParam) {
      return NextResponse.json(
        { error: "Missing userIds", correlationId },
        { status: 400 }
      );
    }
    const userIds = userIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (userIds.length === 0) {
      return NextResponse.json(
        { error: "No valid userIds", correlationId },
        { status: 400 }
      );
    }

    const bucket = adminStorage.bucket();
    console.log(`[Profile Images Batch] Using bucket: ${bucket.name}`);
    const result: Record<string, string | null> = {};
    await Promise.all(
      userIds.map(async (uid) => {
        try {
          // First try ordering from user doc profileImageIds for chosen first image
          const userDoc = await db.collection("users").doc(uid).get();
          const data = userDoc.data() || {};
          console.log(`[Profile Images Batch] User ${uid} exists: ${userDoc.exists}, data keys:`, Object.keys(data || {}));
          const ordered: string[] = Array.isArray(data.profileImageIds)
            ? data.profileImageIds
            : [];
          console.log(`[Profile Images Batch] User ${uid} has ${ordered.length} ordered images`);
          if (ordered.length > 0) {
            // Build URL cheaply
            result[uid] =
              `https://storage.googleapis.com/${bucket.name}/${ordered[0]}`;
            return;
          }
          // Fallback: list storage files (could be slower)
          const [files] = await bucket.getFiles({
            prefix: `users/${uid}/profile-images/`,
            autoPaginate: false,
            maxResults: 1,
          });
          const first = files.find((f) => !f.name.endsWith("/"));
          if (first) {
            result[uid] =
              `https://storage.googleapis.com/${bucket.name}/${first.name}`;
          } else {
            result[uid] = null;
          }
        } catch (error) {
          console.error(`[Profile Images Batch] Error processing user ${uid}:`, error);
          result[uid] = null;
        }
      })
    );

    return NextResponse.json(
      { data: result, success: true, correlationId },
      { status: 200 }
    );
  } catch (err) {
    console.error(`[Profile Images Batch] Top-level error:`, err);
    return NextResponse.json(
      { error: "Failed to fetch images", correlationId, details: (err as Error)?.message },
      { status: 500 }
    );
  } finally {
    // eslint-disable-next-line no-console
    console.info("Profile images BATCH GET complete", {
      scope: "profile_images.batch_get",
      durationMs: Date.now() - startedAt,
      correlationId,
    });
  }
}
