import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { withFirebaseAuth } from "@/lib/auth/firebaseAuth";
import { db } from "@/lib/firebaseAdmin";
import { adminStorage } from "@/lib/firebaseAdminInit";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export const POST = withFirebaseAuth(async (user, request: NextRequest) => {
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return errorResponse("Invalid form data", 400, { correlationId });
    }
    const file = formData.get("image") as File | null;
    if (!file)
      return errorResponse("Missing image file", 400, { correlationId });
    if (!ALLOWED_TYPES.includes((file.type || "").toLowerCase() as any)) {
      return errorResponse("Unsupported image type", 400, { correlationId });
    }
    if (file.size > MAX_BYTES) {
      return errorResponse("File too large. Max 5MB allowed.", 400, {
        correlationId,
      });
    }
    // Direct upload to Firebase Storage
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}_${uuidv4()}.${ext}`;
    const storagePath = `users/${user.id}/profile-images/${fileName}`;
    const bucket = adminStorage.bucket();
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileRef = bucket.file(storagePath);
    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: {
          uploadedBy: user.id,
          uploadedAt: new Date().toISOString(),
          originalName: file.name,
        },
      },
    });
    await fileRef.makePublic().catch(() => {});
    const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    // Persist metadata
    await db
      .collection("users")
      .doc(user.id)
      .collection("images")
      .doc(fileName)
      .set({
        storageId: storagePath,
        fileName,
        originalName: file.name,
        contentType: file.type,
        size: file.size,
        url,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.id,
      });
    // Update ordering if first image
    const userDoc = await db.collection("users").doc(user.id).get();
    const current = (userDoc.data() as any)?.profileImageIds || [];
    if (!Array.isArray(current) || current.length === 0) {
      await db
        .collection("users")
        .doc(user.id)
        .set(
          { profileImageIds: [storagePath], updatedAt: Date.now() },
          { merge: true }
        );
    } else if (!current.includes(storagePath)) {
      await db
        .collection("users")
        .doc(user.id)
        .set(
          { profileImageIds: [...current, storagePath], updatedAt: Date.now() },
          { merge: true }
        );
    }
    return successResponse(
      { message: "Image uploaded", imageId: storagePath, url, correlationId },
      200
    );
  } catch (error) {
    console.error("profile-images.upload firebase error", error);
    return errorResponse("Failed to upload image", 500, { correlationId });
  }
});
