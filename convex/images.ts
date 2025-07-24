import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { checkRateLimit } from "./utils/rateLimit";
import { ConvexError } from "convex/values";
import { requireAdmin, isAdmin } from "./utils/requireAdmin";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

// Constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_USER = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const UPLOAD_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const UPLOAD_RATE_LIMIT_MAX = 10; // Max uploads per window

export const getProfileImages = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    console.log("getProfileImages called with userId:", args.userId);

    try {
      // Validate userId is not empty or just whitespace
      if (!args.userId || args.userId.trim() === "") {
        console.log("Empty or invalid user ID provided");
        return [];
      }

      // Get user profile with image order
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .unique();

      console.log("Profile found:", {
        hasProfile: !!profile,
        profileImageIds: profile?.profileImageIds,
        profileImageIdsLength: profile?.profileImageIds?.length,
      });

      if (!profile) {
        console.log("No profile found for user:", args.userId);
        return [];
      }

      // Get all images for the user
      const allImages = await ctx.db
        .query("images")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      console.log("Images found in database:", {
        count: allImages.length,
        storageIds: allImages.map((img) => img.storageId),
      });

      // When no explicit ID order, check if profileImageUrls exist and return them directly
      if (!profile.profileImageIds || profile.profileImageIds.length === 0) {
        if (profile.profileImageUrls && profile.profileImageUrls.length > 0) {
          console.log("Using profileImageUrls array to return images");
          const mapped = profile.profileImageUrls.map((url, idx) => ({
            _id: `${profile._id}_img_${idx}`,
            storageId: "", // unknown without lookup
            url,
            fileName: "",
            uploadedAt: profile.createdAt || 0,
          }));
          return mapped;
        }

        console.log("No profileImageIds, returning all images in any order");
        const imagePromises = allImages.map(async (image) => {
          const url = await ctx.storage.getUrl(image.storageId);
          console.log("Generated URL for image:", {
            storageId: image.storageId,
            url,
          });
          return {
            _id: image._id,
            storageId: image.storageId,
            url,
            fileName: image.fileName,
            uploadedAt: image._creationTime,
          };
        });
        const result = await Promise.all(imagePromises);
        console.log("Returning all images:", result);
        return result;
      }

      // Map by storageId for fast lookup
      const imageMap = new Map(
        allImages.map((img) => [String(img.storageId), img])
      );

      // Return images in the order of profile.profileImageIds
      const orderedImages = (profile.profileImageIds || [])
        .map((storageId) => imageMap.get(String(storageId)))
        .filter((img): img is NonNullable<typeof img> => Boolean(img));

      console.log("Ordered images based on profileImageIds:", {
        profileImageIds: profile.profileImageIds,
        foundImages: orderedImages.map((img) => img.storageId),
      });

      // If no ordered images found, return all images in any order
      const imagesToProcess =
        orderedImages.length > 0 ? orderedImages : allImages;
      console.log("Images to process:", {
        usingOrdered: orderedImages.length > 0,
        count: imagesToProcess.length,
      });

      const imagePromises = imagesToProcess.map(async (image) => {
        const url = await ctx.storage.getUrl(image.storageId);
        console.log("Generated URL for image:", {
          storageId: image.storageId,
          url,
        });
        return {
          _id: image._id,
          storageId: image.storageId,
          url,
          fileName: image.fileName,
          uploadedAt: image._creationTime,
        };
      });

      const result = await Promise.all(imagePromises);
      console.log("Returning ordered images:", result);
      return result;
    } catch (error) {
      console.error("Error in getProfileImages:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to fetch profile images");
    }
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
    contentType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    try {
      console.log("[uploadProfileImage] Called with userId:", args.userId);
      // Input validation
      if (!args.userId) {
        throw new ConvexError("User ID is required");
      }
      if (!args.storageId) {
        throw new ConvexError("Storage ID is required");
      }
      if (!args.fileName) {
        throw new ConvexError("File name is required");
      }
      // Validate file type
      if (!ALLOWED_TYPES.includes(args.contentType.toLowerCase())) {
        throw new ConvexError(
          `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(", ")}`
        );
      }
      // Validate file size
      if (args.fileSize > MAX_IMAGE_SIZE) {
        throw new ConvexError(
          `File size exceeds maximum allowed size of ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`
        );
      }
      // Rate limiting
      const rateKey = `images:upload:${args.userId}`;
      const rate = await checkRateLimit(
        ctx.db,
        rateKey,
        UPLOAD_RATE_LIMIT_WINDOW_MS,
        UPLOAD_RATE_LIMIT_MAX
      );
      if (!rate.allowed) {
        throw new ConvexError(
          `Too many uploads. Please try again in ${Math.ceil((rate.retryAfter || 0) / 1000)} seconds.`
        );
      }
      // Check if user exists
      const user = await ctx.db.get(args.userId);
      console.log("[uploadProfileImage] User found:", user?._id);
      if (!user) {
        throw new ConvexError("User not found");
      }
      // Check current image count
      const currentImages = await ctx.db
        .query("images")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
      if (currentImages.length >= MAX_IMAGES_PER_USER) {
        throw new ConvexError(
          `Maximum of ${MAX_IMAGES_PER_USER} images allowed per user`
        );
      }
      // Save to images table
      await ctx.db.insert("images", {
        userId: args.userId,
        storageId: args.storageId,
        fileName: args.fileName,
        contentType: args.contentType,
        fileSize: args.fileSize,
      });
      // Generate a public URL for the uploaded image so we can store it directly on the profile
      const imageUrlNullable = await ctx.storage.getUrl(args.storageId);
      if (!imageUrlNullable) {
        throw new ConvexError("Failed to generate image URL");
      }
      const imageUrl = imageUrlNullable;

      // Update profile with the new image ID **and** URL (new approach)
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .first();
      console.log(
        "[uploadProfileImage] Profile found:",
        profile!._id,
        "Current profileImageIds:",
        profile!.profileImageIds
      );
      const currentImageIds =
        (profile!.profileImageIds as Id<"_storage">[]) || [];
      const currentImageUrls = (profile!.profileImageUrls as string[]) || [];

      if (currentImageIds.length === 0) {
        console.log(
          "[uploadProfileImage] profileImageIds is empty, initializing with storageId:",
          args.storageId
        );
        await ctx.db.patch(profile!._id, {
          profileImageIds: [args.storageId],
          profileImageUrls: [imageUrl],
          updatedAt: Date.now(),
        });
        console.log("[uploadProfileImage] Profile patched with new image ID.");
      } else if (!currentImageIds.includes(args.storageId)) {
        console.log(
          "[uploadProfileImage] Adding new storageId to existing profileImageIds:",
          args.storageId,
          "(profileImageUrls not modified)"
        );
        const newImageIds = [...currentImageIds, args.storageId];
        const newImageUrls = [...currentImageUrls, imageUrl];
        await ctx.db.patch(profile!._id, {
          profileImageIds: newImageIds,
          profileImageUrls: newImageUrls,
          updatedAt: Date.now(),
        });
        console.log(
          "[uploadProfileImage] Profile patched with updated image IDs."
        );
      } else {
        console.log(
          "[uploadProfileImage] StorageId already exists in profileImageIds:",
          args.storageId,
          "(profileImageUrls not modified)"
        );
      }
      return {
        success: true,
        imageId: args.storageId,
        imageUrl,
        message: "Image uploaded successfully",
      };
    } catch (error) {
      console.error("Error in uploadProfileImage:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to upload profile image");
    }
  },
});

export const deleteProfileImage = mutation({
  args: {
    userId: v.id("users"),
    imageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    try {
      // Input validation
      if (!args.userId) {
        throw new ConvexError("User ID is required");
      }
      if (!args.imageId) {
        throw new ConvexError("Image ID is required");
      }

      // Find the image to delete
      const image = await ctx.db
        .query("images")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .filter((q) => q.eq(q.field("storageId"), args.imageId))
        .first();

      if (!image) {
        throw new ConvexError("Image not found or not owned by user");
      }

      // Find the profile to update
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .first();

      if (!profile) {
        throw new ConvexError("User profile not found");
      }

      // Remove the image reference from the profile if it exists
      if (profile.profileImageIds && profile.profileImageIds.length > 0) {
        const updatedImageIds = profile.profileImageIds.filter(
          (id) => id !== args.imageId
        );

        if (updatedImageIds.length !== profile.profileImageIds.length) {
          // Also compute URL to remove from profileImageUrls
          const urlToRemoveNullable = await ctx.storage.getUrl(args.imageId);
          const urlToRemove = urlToRemoveNullable || null;

          let updatedImageUrls: string[] | undefined =
            profile.profileImageUrls as string[] | undefined;
          if (updatedImageUrls && urlToRemove) {
            updatedImageUrls = updatedImageUrls.filter(
              (u) => u !== urlToRemove
            );
          }

          await ctx.db.patch(profile._id, {
            profileImageIds: updatedImageIds,
            profileImageUrls: updatedImageUrls,
            updatedAt: Date.now(),
          });
        }
      }

      // Delete the image from storage and database
      await ctx.storage.delete(args.imageId);
      await ctx.db.delete(image._id);

      return {
        success: true,
        message: "Image deleted successfully",
      };
    } catch (error) {
      console.error("Error in deleteProfileImage:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to delete profile image");
    }
  },
});

export const batchGetProfileImages = query({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    try {
      if (!Array.isArray(args.userIds)) {
        throw new ConvexError("User IDs must be an array");
      }

      // Get all images for the requested users
      // First fetch all images and then filter in memory since Convex doesn't support .in() with multiple values
      const allImages = (await ctx.db.query("images").collect()).filter((img) =>
        args.userIds.includes(img.userId)
      );

      // Group images by user ID
      const imagesByUser = new Map<string, unknown[]>();
      for (const image of allImages) {
        // Cast image to expected type to access userId
        const img = image as { userId: string };
        const userId = img.userId;
        if (!imagesByUser.has(userId)) {
          imagesByUser.set(userId, []);
        }
        const arr = imagesByUser.get(userId) as
          | { userId: string; storageId: string }[]
          | undefined;
        if (arr) arr.push(image as { userId: string; storageId: string });
      }

      // Create result object with user IDs and their first image URL
      const result: Record<string, string | null> = {};
      for (const userId of args.userIds) {
        const userImages =
          (imagesByUser.get(userId) as { storageId: Id<"_storage"> }[]) || [];
        result[userId] =
          userImages.length > 0
            ? await ctx.storage.getUrl(userImages[0].storageId)
            : null;
      }

      return result;
    } catch (error) {
      console.error("Error in batchGetProfileImages:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to fetch profile images in batch");
    }
  },
});

export const updateProfileImageOrder = mutation({
  args: {
    userId: v.id("users"),
    imageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    try {
      // Input validation
      if (!args.userId) {
        throw new ConvexError("User ID is required");
      }
      if (!Array.isArray(args.imageIds)) {
        throw new ConvexError("Image IDs must be an array");
      }

      // Check authentication
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new ConvexError("Not authenticated");
      }

      // Get the current user
      const user = await ctx.runQuery(api.users.getUserByEmail, {
        email: identity.email!,
      });

      if (!user) {
        throw new ConvexError("User not found");
      }

      // Allow if user is updating their own profile OR if they are an admin
      const isUserProfile = user._id === args.userId;
      const isUserAdmin = isAdmin(identity);

      if (!isUserProfile && !isUserAdmin) {
        throw new ConvexError("Unauthorized to update this profile");
      }

      // Get the profile to update
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .first();

      if (!profile) {
        throw new ConvexError("Profile not found");
      }

      // If no image IDs provided, just clear the order
      if (args.imageIds.length === 0) {
        await ctx.db.patch(profile._id, {
          profileImageIds: [],
          profileImageUrls: [],
          updatedAt: Date.now(),
        });
        return { success: true, message: "Image order cleared" };
      }

      // Verify all image IDs belong to this user
      const userImages = await ctx.db
        .query("images")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      const userImageIds = new Set(userImages.map((img) => img.storageId));
      const invalidImageIds = args.imageIds.filter(
        (id) => !userImageIds.has(id)
      );

      if (invalidImageIds.length > 0) {
        throw new ConvexError(
          `Invalid image IDs: ${invalidImageIds.join(", ")}`
        );
      }

      // Build the corresponding URL order array
      const urlPromises = args.imageIds.map((id) => ctx.storage.getUrl(id));
      const urlResults = await Promise.all(urlPromises);
      const urlsRaw = urlResults.filter((u): u is string => Boolean(u));
      const urls: string[] = urlsRaw.filter((u): u is string => Boolean(u));

      await ctx.db.patch(profile._id, {
        profileImageIds: args.imageIds,
        profileImageUrls: urls,
        updatedAt: Date.now(),
      });

      return {
        success: true,
        message: "Image order updated successfully",
      };
    } catch (error) {
      console.error("Error in updateProfileImageOrder:", error);
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError("Failed to update image order");
    }
  },
});

export const uploadBlogImage = mutation({
  args: {
    storageId: v.string(),
    fileName: v.string(),
    contentType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Only allow admins to upload blog images
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    // Save to blogImages table
    const now = Date.now();
    await ctx.db.insert("blogImages", {
      storageId: args.storageId,
      fileName: args.fileName,
      contentType: args.contentType,
      fileSize: args.fileSize,
      createdAt: now,
    });
    // Get public URL
    const url = await ctx.storage.getUrl(args.storageId);
    return { success: true, url };
  },
});
