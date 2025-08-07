import { getJson, postJson, putJson } from "@/lib/http/client";

/**
 * Image utilities using the centralized HTTP client.
 * No token parameters are accepted; Authorization is auto-attached via tokenStorage.
 */

// Deprecated: switched to single local multipart endpoint
export async function getImageUploadUrl(): Promise<string> {
  throw new Error(
    "Deprecated: use /api/profile-images/upload with multipart FormData"
  );
}

export async function saveImageMeta(_: any): Promise<{ imageId: string }> {
  throw new Error(
    "Deprecated: metadata saved server-side in /api/profile-images/upload"
  );
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
