import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { checkRateLimit } from "./utils/rateLimit";
import { ConvexError } from "convex/values";

// Constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_USER = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const UPLOAD_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const UPLOAD_RATE_LIMIT_MAX = 10; // Max uploads per window

export const getProfileImages = query({
  args: { 
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    console.log('getProfileImages called with userId:', args.userId);
    
    try {
      // Validate userId is not empty or just whitespace
      if (!args.userId || args.userId.trim() === '') {
        console.log('Empty or invalid user ID provided');
        return [];
      }

      // Get user profile with image order
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .unique();

      console.log('Profile found:', {
        hasProfile: !!profile,
        profileImageIds: profile?.profileImageIds,
        profileImageIdsLength: profile?.profileImageIds?.length
      });

      if (!profile) {
        console.log('No profile found for user:', args.userId);
        return [];
      }

      // Get all images for the user
      const allImages = await ctx.db
        .query("images")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      console.log('Images found in database:', {
        count: allImages.length,
        storageIds: allImages.map(img => img.storageId)
      });

      // If no explicit order, return all images
      if (!profile.profileImageIds || profile.profileImageIds.length === 0) {
        console.log('No profileImageIds, returning all images in any order');
        const imagePromises = allImages.map(async (image) => {
          const url = await ctx.storage.getUrl(image.storageId);
          console.log('Generated URL for image:', { storageId: image.storageId, url });
          return {
            _id: image._id,
            storageId: image.storageId,
            url,
            fileName: image.fileName,
            uploadedAt: image._creationTime,
          };
        });
        const result = await Promise.all(imagePromises);
        console.log('Returning all images:', result);
        return result;
      }

      // Map by storageId for fast lookup
      const imageMap = new Map(
        allImages.map(img => [String(img.storageId), img])
      );

      // Return images in the order of profile.profileImageIds
      const orderedImages = (profile.profileImageIds || [])
        .map(storageId => imageMap.get(String(storageId)))
        .filter((img): img is NonNullable<typeof img> => Boolean(img));

      console.log('Ordered images based on profileImageIds:', {
        profileImageIds: profile.profileImageIds,
        foundImages: orderedImages.map(img => img.storageId)
      });

      // If no ordered images found, return all images in any order
      const imagesToProcess = orderedImages.length > 0 ? orderedImages : allImages;
      console.log('Images to process:', {
        usingOrdered: orderedImages.length > 0,
        count: imagesToProcess.length
      });

      const imagePromises = imagesToProcess.map(async (image) => {
        const url = await ctx.storage.getUrl(image.storageId);
        console.log('Generated URL for image:', { storageId: image.storageId, url });
        return {
          _id: image._id,
          storageId: image.storageId,
          url,
          fileName: image.fileName,
          uploadedAt: image._creationTime,
        };
      });

      const result = await Promise.all(imagePromises);
      console.log('Returning ordered images:', result);
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

      // Update profile with the new image ID
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .first();

      if (!profile) {
        throw new ConvexError("User profile not found");
      }

      const currentImageIds = profile.profileImageIds || [];
      
      // Don't add duplicate image IDs
      if (!currentImageIds.includes(args.storageId)) {
        await ctx.db.patch(profile._id, {
          profileImageIds: [...currentImageIds, args.storageId],
          updatedAt: Date.now(),
        });
      }

      return { 
        success: true, 
        imageId: args.storageId,
        message: "Image uploaded successfully" 
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
          await ctx.db.patch(profile._id, {
            profileImageIds: updatedImageIds,
            updatedAt: Date.now(),
          });
        }
      }

      // Delete the image from storage and database
      await ctx.storage.delete(args.imageId);
      await ctx.db.delete(image._id);
      
      return { 
        success: true,
        message: "Image deleted successfully"
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
      const allImages = (await ctx.db.query("images").collect())
        .filter(img => args.userIds.includes(img.userId));

      // Group images by user ID
      const imagesByUser = new Map<string, any[]>();
      for (const image of allImages) {
        const userId = image.userId;
        if (!imagesByUser.has(userId)) {
          imagesByUser.set(userId, []);
        }
        imagesByUser.get(userId)?.push(image);
      }

      // Create result object with user IDs and their first image URL
      const result: Record<string, string | null> = {};
      for (const userId of args.userIds) {
        const userImages = imagesByUser.get(userId) || [];
        result[userId] = userImages.length > 0 
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

      // Only allow updating your own profile
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .unique();
      
      if (!user || user._id !== args.userId) {
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
          updatedAt: Date.now() 
        });
        return { success: true, message: "Image order cleared" };
      }

      // Verify all image IDs belong to this user
      const userImages = await ctx.db
        .query("images")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();
      
      const userImageIds = new Set(userImages.map(img => img.storageId));
      const invalidImageIds = args.imageIds.filter(id => !userImageIds.has(id));
      
      if (invalidImageIds.length > 0) {
        throw new ConvexError(`Invalid image IDs: ${invalidImageIds.join(", ")}`);
      }

      // Update the profile with the new image order
      await ctx.db.patch(profile._id, { 
        profileImageIds: args.imageIds,
        updatedAt: Date.now() 
      });
      
      return { 
        success: true,
        message: "Image order updated successfully" 
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
