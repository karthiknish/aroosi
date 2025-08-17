import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";

export const POST = withFirebaseAuth(async (authUser, request: NextRequest) => {
  try {
    const { fileName, uploadId } = (await request.json().catch(() => ({}))) as {
      fileName?: string;
      uploadId?: string; // treat as storageId for firebase flow
    };
    if (!fileName || !uploadId) {
      return errorResponse("Missing fileName or uploadId", 400);
    }
    // Check image metadata exists (best-effort)
    const docId = uploadId.split("/").pop() || uploadId;
    const snap = await db
      .collection("users")
      .doc(authUser.id)
      .collection("images")
      .doc(docId)
      .get();
    if (!snap.exists) {
      return errorResponse("Image not found", 404);
    }
    return successResponse({
      message: "Image upload confirmed",
      fileName,
      uploadId,
      confirmedAt: Date.now(),
    });
  } catch (error) {
    console.error("Error confirming image upload:", error);
    return errorResponse("Failed to confirm image upload", 500);
  }
});
