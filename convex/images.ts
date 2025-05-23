import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_IMAGES = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const getProfileImages = query({
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

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const uploadProfileImage = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    // Save to database
    return await ctx.db.insert("images", {
      userId: args.userId,
      storageId: args.storageId,
      fileName: args.fileName,
    });
  },
});

export const deleteProfileImage = mutation({
  args: {
    userId: v.id("users"),
    imageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const image = await ctx.db
      .query("images")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.eq(q.field("storageId"), args.imageId))
      .first();

    if (!image) {
      throw new Error("Image not found");
    }

    await ctx.storage.delete(args.imageId);
    await ctx.db.delete(image._id);
  },
});

export const batchGetProfileImages = query({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const images = await ctx.db.query("images").collect();
    const userIdToImageUrl: Record<string, string | null> = {};
    for (const userId of args.userIds) {
      const userImages = images.filter((img) => img.userId === userId);
      userIdToImageUrl[userId] =
        userImages.length > 0
          ? await ctx.storage.getUrl(userImages[0].storageId)
          : null;
    }
    return userIdToImageUrl;
  },
});
