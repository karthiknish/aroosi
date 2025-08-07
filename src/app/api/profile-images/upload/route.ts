import { NextRequest } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireSession, devLog } from "@/app/api/_utils/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  const correlationId = Math.random().toString(36).slice(2, 10);
  try {
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId } = session;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return errorResponse("Invalid form data", 400, { correlationId });
    }

    const file = formData.get("image") as File | null;
    if (!file) return errorResponse("Missing image file", 400, { correlationId });

    if (!ALLOWED_TYPES.includes((file.type || "").toLowerCase() as any)) {
      return errorResponse("Unsupported image type", 400, { correlationId });
    }
    if (file.size > MAX_BYTES) {
      return errorResponse("File too large. Max 5MB allowed.", 400, { correlationId });
    }

    const uploadUrl = await fetchMutation(api.images.generateUploadUrl as any, {} as any);
    if (!uploadUrl || typeof uploadUrl !== "string") {
      return errorResponse("Failed to get upload URL", 500, { correlationId });
    }

    const putResp = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!putResp.ok) {
      const txt = await putResp.text().catch(() => "");
      return errorResponse(txt || "Failed to upload image", 500, { correlationId });
    }
    const { storageId } = (await putResp.json().catch(() => ({}))) as { storageId?: string };
    if (!storageId) return errorResponse("Upload failed: no storageId", 500, { correlationId });

    const result = await fetchMutation(api.images.uploadProfileImage as any, {
      userId: userId as Id<"users">,
      storageId: storageId as Id<"_storage">,
      fileName: file.name || "image.jpg",
      contentType: file.type,
      fileSize: file.size,
    } as any);

    if (!result || (typeof result === "object" && (result as any).success !== true)) {
      return errorResponse("Failed to save image", 500, { correlationId });
    }

    return successResponse(
      {
        message: "Image uploaded",
        imageId: (result as any).imageId || storageId,
        url: (result as any).imageUrl || null,
        correlationId,
      },
      200,
    );
  } catch (error) {
    devLog("error", "profile-images.upload", "Failed to upload image", {
      error: error instanceof Error ? error.message : String(error),
      correlationId,
    });
    return errorResponse("Failed to upload image", 500, { correlationId });
  }
}


