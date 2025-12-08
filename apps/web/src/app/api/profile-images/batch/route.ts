import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebaseAdminInit";
import { db } from "@/lib/firebaseAdmin";

// Batch endpoint returning a mapping of userId -> array of image objects with signed URLs
// Used by admin profile pages to fetch images efficiently

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

    // Limit batch size to prevent abuse
    const MAX_BATCH_SIZE = 50;
    const limitedUserIds = userIds.slice(0, MAX_BATCH_SIZE);

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`;
    const bucket = adminStorage.bucket(bucketName);

    // Helper to generate signed URL
    const getSignedUrl = async (storagePath: string): Promise<string> => {
      try {
        const file = bucket.file(storagePath);
        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 60 * 60 * 1000, // 1 hour
        });
        return signedUrl;
      } catch {
        // Fallback to public URL
        return `https://storage.googleapis.com/${bucketName}/${storagePath}`;
      }
    };

    // Result: userId -> array of { _id, id, storageId, url }
    const result: Record<string, Array<{ _id: string; id: string; storageId: string; url: string }>> = {};

    await Promise.all(
      limitedUserIds.map(async (uid) => {
        try {
          const userDoc = await db.collection("users").doc(uid).get();
          if (!userDoc.exists) {
            result[uid] = [];
            return;
          }

          const data = userDoc.data() || {};
          const profileImageIds: string[] = Array.isArray(data.profileImageIds)
            ? data.profileImageIds
            : [];
          const profileImageUrls: string[] = Array.isArray(data.profileImageUrls)
            ? data.profileImageUrls
            : [];

          if (profileImageIds.length > 0) {
            // Use ordered profileImageIds - generate signed URLs for each
            const images = await Promise.all(
              profileImageIds.slice(0, 10).map(async (storageId, index) => {
                let url = profileImageUrls[index] || "";

                // If URL is a GCS path or private, generate signed URL
                if (!url || url.includes("storage.googleapis.com") && !url.includes("X-Goog-Signature")) {
                  url = await getSignedUrl(storageId);
                }

                return {
                  _id: storageId,
                  id: storageId,
                  storageId,
                  url,
                };
              })
            );
            result[uid] = images;
          } else if (profileImageUrls.length > 0) {
            // Fallback: use profileImageUrls directly, sign if needed
            const images = await Promise.all(
              profileImageUrls.slice(0, 10).map(async (rawUrl, index) => {
                let url = rawUrl;
                const storageId = `${uid}_${index}`;

                // If it's a storage path, sign it
                if (rawUrl.startsWith("users/")) {
                  url = await getSignedUrl(rawUrl);
                } else if (rawUrl.includes("storage.googleapis.com") && !rawUrl.includes("X-Goog-Signature")) {
                  // Extract path and sign
                  const match = rawUrl.match(/storage\.googleapis\.com\/[^/]+\/(.+)/);
                  if (match && match[1]) {
                    url = await getSignedUrl(decodeURIComponent(match[1]));
                  }
                }

                return {
                  _id: storageId,
                  id: storageId,
                  storageId,
                  url,
                };
              })
            );
            result[uid] = images;
          } else {
            result[uid] = [];
          }
        } catch (error) {
          console.error(`[Profile Images Batch] Error processing user ${uid}:`, error);
          result[uid] = [];
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
    // Logging removed for cleaner output
  }
}

