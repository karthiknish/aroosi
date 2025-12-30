import { z } from "zod";
import {
  createAuthenticatedHandler,
  errorResponse,
  ErrorCode,
  successResponse,
} from "@/lib/api/handler";
import { adminStorage } from "@/lib/firebaseAdminInit";
import { db } from "@/lib/firebaseAdmin";

// Batch endpoint returning a mapping of userId -> array of image objects with signed URLs
// Used by admin profile pages to fetch images efficiently

const querySchema = z.object({
  userIds: z
    .string()
    .min(1)
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .refine((ids) => ids.length > 0, "No valid userIds")
    .refine((ids) => ids.length <= 50, "Too many userIds"),
});

// Admin-only endpoint returning a mapping of userId -> array of image objects with signed URLs
export const GET = createAuthenticatedHandler(
  async (ctx) => {
    if (!ctx.user.isAdmin) {
      return errorResponse("Admin privileges required", 403, {
        correlationId: ctx.correlationId,
        code: ErrorCode.FORBIDDEN,
      });
    }

    const parsed = querySchema.safeParse({
      userIds: ctx.request.nextUrl.searchParams.get("userIds"),
    });
    if (!parsed.success) {
      return errorResponse("Invalid request", 400, {
        correlationId: ctx.correlationId,
        code: ErrorCode.VALIDATION_ERROR,
        details: { errors: parsed.error.issues },
      });
    }

    const limitedUserIds = parsed.data.userIds;

    const bucketName =
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`;
    const bucket = adminStorage.bucket(bucketName);

    const getSignedUrl = async (storagePath: string): Promise<string> => {
      try {
        const file = bucket.file(storagePath);
        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 60 * 60 * 1000,
        });
        return signedUrl;
      } catch {
        return `https://storage.googleapis.com/${bucketName}/${storagePath}`;
      }
    };

    const result: Record<
      string,
      Array<{ _id: string; id: string; storageId: string; url: string }>
    > = {};

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
            const images = await Promise.all(
              profileImageIds.slice(0, 10).map(async (storageId, index) => {
                let url = profileImageUrls[index] || "";
                if (
                  !url ||
                  (url.includes("storage.googleapis.com") &&
                    !url.includes("X-Goog-Signature"))
                ) {
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
            return;
          }

          if (profileImageUrls.length > 0) {
            const images = await Promise.all(
              profileImageUrls.slice(0, 10).map(async (rawUrl, index) => {
                let url = rawUrl;
                const storageId = `${uid}_${index}`;

                if (rawUrl.startsWith("users/")) {
                  url = await getSignedUrl(rawUrl);
                } else if (
                  rawUrl.includes("storage.googleapis.com") &&
                  !rawUrl.includes("X-Goog-Signature")
                ) {
                  const match = rawUrl.match(
                    /storage\.googleapis\.com\/[^/]+\/(.+)/
                  );
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
            return;
          }

          result[uid] = [];
        } catch (error) {
          console.error(
            `[Profile Images Batch] Error processing user ${uid}:`,
            error
          );
          result[uid] = [];
        }
      })
    );

    return successResponse(result, 200, ctx.correlationId);
  },
  {
    rateLimit: { identifier: "profile_images_batch", maxRequests: 30 },
  }
);

