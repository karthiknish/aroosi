import { action, mutation, query, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { checkRateLimit } from "./utils/rateLimit";

/**
 * Generate a one-time upload URL for direct uploads.
 */
export const generateUploadUrl = action(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

/**
 * List stored images for a user, resolving public URLs.
 */
export const listImages = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("images")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    return Promise.all(
      images.map(async (image) => ({
        _id: image._id,
        url: await ctx.storage.getUrl(image.storageId),
      }))
    );
  },
});

/**
 * Record an uploaded image in DB with rate limiting on userId.
 */
export const uploadImage = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.string(),
    fileName: v.string(),
    contentType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    // Rate limit by userId
    const rateKey = `storage:upload:${args.userId}`;
    const rate = await checkRateLimit(ctx.db, rateKey);
    if (!rate.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil(
          (rate.retryAfter || 0) / 1000
        )} seconds.`,
      };
    }
    return await ctx.db.insert("images", {
      userId: args.userId,
      storageId: args.storageId,
      fileName: args.fileName,
      contentType: args.contentType,
      fileSize: args.fileSize,
    });
  },
});

/**
 * Delete an image from storage and DB with user-scoped rate limiting.
 */
export const deleteImage = mutation({
  args: {
    storageId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Rate limit by userId instead of storageId
    const rateKey = `storage:delete:${args.userId}`;
    const rate = await checkRateLimit(ctx.db, rateKey);
    if (!rate.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil(
          (rate.retryAfter || 0) / 1000
        )} seconds.`,
      };
    }
    const image = await ctx.db
      .query("images")
      .filter((q) =>
        q.and(
          q.eq(q.field("storageId"), args.storageId),
          q.eq(q.field("userId"), args.userId)
        )
      )
      .first();

    if (!image) {
      throw new Error("Image not found");
    }

    await ctx.storage.delete(image.storageId);
    await ctx.db.delete(image._id);
  },
});

/**
 * Internal action to upload raw bytes (Uint8Array) into Convex storage and return storageId.
 * Used by the Next.js /api/messages/upload-image route.
 */
export const uploadBytes = internalAction({
  args: {
    bytes: v.bytes(),
    fileName: v.string(),
    contentType: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    // Convex storage expects a Blob; construct from bytes with contentType.
    const blob = new Blob([args.bytes], { type: args.contentType });
    const storageId = await ctx.storage.store(blob);
    // Optionally persist metadata in a table here if needed.
    return storageId;
  },
});
