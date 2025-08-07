import { getJson, postJson, putJson } from "@/lib/http/client";

/**
 * Image utilities using the centralized HTTP client.
 * No token parameters are accepted; Authorization is auto-attached via tokenStorage.
 */

export async function getImageUploadUrl(): Promise<string> {
  // GET presigned upload URL
  // Endpoint present at: /api/profile-images/upload-url
  const res = await getJson<{ uploadUrl: string }>("/api/profile-images/upload-url");
  const url = (res as any)?.uploadUrl || (typeof res === "string" ? res : "");
  if (!url || typeof url !== "string") {
    throw new Error("Failed to obtain upload URL");
  }
  return url;
}

export async function saveImageMeta(args: {
  userId: string;
  storageId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}): Promise<{ imageId: string }> {
  // POST metadata confirmation after successful binary upload
  // Endpoint present at: /api/profile-images/confirm
  const res = await postJson<{ imageId: string }>("/api/profile-images/confirm", {
    userId: args.userId,
    storageId: args.storageId,
    fileName: args.fileName,
    contentType: args.contentType,
    fileSize: args.fileSize,
  });
  const imageId = (res as any)?.imageId;
  if (!imageId || typeof imageId !== "string") {
    throw new Error("Image metadata confirmation failed");
  }
  return { imageId };
}

export async function updateImageOrder(args: {
  userId: string;
  imageIds: string[];
}): Promise<{ ok: true }> {
  // PUT new order to server
  // Endpoint present at: /api/profile-images/order
  await putJson("/api/profile-images/order", {
    userId: args.userId,
    imageIds: args.imageIds,
  });
  return { ok: true };
}
