import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { checkRateLimit } from "./utils/rateLimit";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_IMAGES = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const getProfileImages = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get the profile to get the order
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!profile || !profile.profileImageIds) {
      // fallback: return all images unordered
      const images = await ctx.db
        .query("images")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .collect();
      return Promise.all(
        images.map(async (image) => ({
          _id: image._id,
          storageId: image.storageId,
          url: await ctx.storage.getUrl(image.storageId),
        }))
      );
    }

    // Get all images for the user
    const allImages = await ctx.db
      .query("images")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    // Map by storageId for fast lookup
    const imageMap = Object.fromEntries(
      allImages.map((img) => [String(img.storageId), img])
    );

    // Return images in the order of profile.profileImageIds
    const orderedImages = profile.profileImageIds
      .map((storageId) => imageMap[String(storageId)])
      .filter(Boolean);

    return Promise.all(
      orderedImages.map(async (image) => ({
        _id: image._id,
        storageId: image.storageId,
        url: await ctx.storage.getUrl(image.storageId),
      }))
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Rate limit by a generic key (could use user identity if available)
    const rateKey = `images:generateUploadUrl`;
    const rate = await checkRateLimit(ctx.db, rateKey);
    if (!rate.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rate.retryAfter || 0) / 1000)} seconds.`,
      };
    }
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
    // Rate limit by userId
    const rateKey = `images:upload:${args.userId}`;
    const rate = await checkRateLimit(ctx.db, rateKey);
    if (!rate.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rate.retryAfter || 0) / 1000)} seconds.`,
      };
    }
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
    // Rate limit by userId
    const rateKey = `images:delete:${args.userId}`;
    const rate = await checkRateLimit(ctx.db, rateKey);
    if (!rate.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rate.retryAfter || 0) / 1000)} seconds.`,
      };
    }
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
