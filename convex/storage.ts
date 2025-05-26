import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { checkRateLimit } from "./utils/rateLimit";

export const generateUploadUrl = action(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

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
        error: `Rate limit exceeded. Try again in ${Math.ceil((rate.retryAfter || 0) / 1000)} seconds.`,
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
        error: `Rate limit exceeded. Try again in ${Math.ceil((rate.retryAfter || 0) / 1000)} seconds.`,
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
