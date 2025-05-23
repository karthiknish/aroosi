import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("images", {
      userId: args.userId,
      storageId: args.storageId,
      fileName: args.fileName,
    });
  },
});

export const deleteImage = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const image = await ctx.db
      .query("images")
      .filter((q) => q.eq(q.field("storageId"), args.storageId))
      .first();

    if (!image) {
      throw new Error("Image not found");
    }

    await ctx.storage.delete(image.storageId);
    await ctx.db.delete(image._id);
  },
});
