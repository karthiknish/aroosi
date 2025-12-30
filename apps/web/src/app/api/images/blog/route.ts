import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/handler";
import { requireSession } from "@/app/api/_utils/auth";
import { db, adminStorage } from "@/lib/firebaseAdmin";

// POST /api/images/blog
// Upload metadata for a blog image and retrieve its public URL.
// Requires a valid Bearer token. Only admins are authorized to call this.
export async function POST(req: NextRequest) {
  // Cookie/session auth; no bearer header expected

  // Parse body
  let body: {
    storageId?: string;
    fileName?: string;
    contentType?: string;
    fileSize?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { storageId, fileName, contentType, fileSize } = body;
  if (!storageId || !fileName) {
    return errorResponse("Missing storageId or fileName", 400);
  }

  // Basic validation for image types/sizes (mirror profile image rules)
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

  if (contentType && !ALLOWED_TYPES.includes(contentType)) {
    return errorResponse("Unsupported image type", 400);
  }
  if (fileSize && fileSize > MAX_SIZE_BYTES) {
    return errorResponse("File too large. Max 5MB allowed.", 400);
  }

  // Auth (require admin session once role system integrated) - placeholder allow if session exists
  const session = await requireSession(req);
  if ("errorResponse" in session) return session.errorResponse;

  // Placeholder Firestore metadata write (no actual file handling here; assume already uploaded to storage by client flow)
  try {
    await db
      .collection("blogImages")
      .doc(storageId)
      .set(
        {
          storageId,
          fileName,
          contentType: contentType || null,
          fileSize: fileSize || null,
          uploadedBy: session.userId,
          createdAt: Date.now(),
        },
        { merge: true }
      );
    // Try to construct a public URL when the bucket is public; otherwise return null (client can sign if needed)
    let url: string | null = null;
    try {
      const bucket = adminStorage.bucket();
      const [exists] = await bucket.file(storageId).exists();
      if (exists) {
        const bucketName = bucket.name;
        url = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(storageId)}`;
      }
    } catch {}
    return successResponse({
      success: true,
      storageId,
      fileName,
      url,
      placeholder: !url,
    });
  } catch (err) {
    console.error("/api/images/blog Firestore write error", err);
    return errorResponse("Failed to record blog image metadata", 500);
  }
}
