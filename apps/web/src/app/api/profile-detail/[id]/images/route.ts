import { NextRequest, NextResponse } from "next/server";
import { db, adminStorage } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { successResponse, errorResponse } from "@/lib/api/handler";

// Add debug logging
const debug = process.env.NODE_ENV === "development";

export async function GET(req: NextRequest) {
  const startTime = nowTimestamp();
  const url = new URL(req.url);
  const requestId = Math.random().toString(36).substring(2, 9);

  const log = (message: string, data?: any) => {
    if (debug) {
      console.log(
        `[${new Date(nowTimestamp()).toISOString()}] [${requestId}] ${message}`,
        data || ""
      );
    }
  };

  try {
    const pathParts = url.pathname.split("/");
    const id = pathParts[pathParts.indexOf("profile-detail") + 1];

    if (!id) {
      return errorResponse("Missing profile ID", 400);
    }

    log(`Fetching images for profile: ${id}`);

    const profileSnap = await db.collection("users").doc(id).get();

    if (!profileSnap.exists) {
      log(`Profile not found: ${id}`);
      return errorResponse("Profile not found", 404);
    }

    const profileData = profileSnap.data();
    const images = profileData?.profileImageUrls || [];

    log(`Found ${images.length} images`);

    const processedImages = await Promise.all(
      images.map(async (img: string) => {
        if (!img) return null;

        // If it's already a full URL, return it
        if (img.startsWith("http")) return img;

        // If it's a storage path, generate a signed URL
        try {
          const file = adminStorage.bucket().file(img);
          const [exists] = await file.exists();

          if (exists) {
            const [signedUrl] = await file.getSignedUrl({
              action: "read",
              expires: nowTimestamp() + 60 * 60 * 1000, // 1 hour
            });
            return signedUrl;
          }
        } catch (e) {
          log(`Error signing URL for ${img}`, e);
        }

        return null;
      })
    );

    const result = processedImages.filter(Boolean);
    const duration = nowTimestamp() - startTime;
    log(`Completed in ${duration}ms`);

    return successResponse({ images: result });
  } catch (err) {
    console.error(`[${requestId}] Profile images error:`, err);
    return errorResponse("Failed to fetch profile images", 500);
  }
}
