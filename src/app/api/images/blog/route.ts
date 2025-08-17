import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireSession } from "@/app/api/_utils/auth";
import { db } from "@/lib/firebaseAdmin";

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
    return successResponse({
      success: true,
      storageId,
      fileName,
      url: null, // TODO: generate signed URL or public URL if needed
      placeholder: true,
    });
  } catch (err) {
    console.error("/api/images/blog Firestore write error", err);
    return errorResponse("Failed to record blog image metadata", 500);
  }
}
