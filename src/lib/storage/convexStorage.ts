import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

/**
 * Upload raw bytes to Convex storage via an action/mutation and return storageId.
 * This helper assumes you have an action/mutation exposed from Convex that accepts:
 *   - bytes: Uint8Array
 *   - fileName: string
 *   - contentType: string
 *
 * If you don't have one yet, create a Convex action like:
 *
 * // aroosi/convex/storage.ts
 * import { action } from "convex/server";
 * import { v } from "convex/values";
 *
 * export const uploadBytes = action({
 *   args: {
 *     bytes: v.bytes(),
 *     fileName: v.string(),
 *     contentType: v.string(),
 *   },
 *   handler: async (ctx, args) => {
 *     const id = await ctx.storage.store(args.bytes);
 *     // Optionally add metadata in a table if needed (fileName/contentType)
 *     return id;
 *   },
 * });
 *
 * Then ensure it's exported via @convex/_generated/api.
 */

function getConvexClientOrThrow(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
  }
  return new ConvexHttpClient(url);
}

/**
 * Upload image/file bytes and return Convex storageId string.
 */
export async function uploadImageToStorage(
  bytes: Uint8Array,
  fileName: string,
  contentType: string,
  token?: string
): Promise<string> {
  const client = getConvexClientOrThrow();
  try {
    // Optional auth if Convex requires it
    // @ts-ignore setAuth may be optional depending on Convex version
    if (token) client.setAuth?.(token);
  } catch {
    // ignore
  }

  // Call your Convex action for uploading bytes.
  // Update api.storage.uploadBytes to match your actual exported action name.
  try {
    // @ts-ignore The path must exist in your generated API
    const storageId: string = await client.action(api.storage.uploadBytes, {
      bytes,
      fileName,
      contentType,
    });
    return storageId;
  } catch (e: any) {
    const message = e?.message || "Failed to upload bytes to Convex";
    throw new Error(message);
  }
}