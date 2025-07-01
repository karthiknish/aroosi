/* eslint-disable @typescript-eslint/no-explicit-any */
"use strict";
import {
  internalMutation,
  query,
  mutation,
  type QueryCtx,
  type MutationCtx,
  action,
  internalAction,
} from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { requireAdmin } from "./utils/requireAdmin";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api"; // Ensure internal is imported

// Simplified Convex-side profile interface.
// Convex mutations often patch partial objects and accept runtime-validated values, so the compile-time type must be permissive.
export interface ConvexProfile {
  _id: Id<"profiles">;
  userId: Id<"users">;
  clerkId: string;
  email?: string;
  // Allow any additional fields with flexible types
  [key: string]: any;
}

// Re-export as `Profile` so existing Convex files that import { Profile } remain valid.
export type Profile = ConvexProfile;

// Types based on schema
export interface User {
  _id: Id<"users">;
  clerkId: string;
  email: string;
  banned?: boolean;
  role?: string;
}

// Public-facing profile type (for getUserPublicProfile)
export interface PublicProfile {
  fullName?: string;
  city?: string;
  height?: string;
  maritalStatus?: "single" | "divorced" | "widowed" | "annulled";
  education?: string;
  occupation?: string;
  aboutMe?: string;
  profileImageIds?: Id<"_storage">[];
  createdAt: number;
  // Add more fields as needed, but do not include _id, userId, clerkId
  [key: string]: unknown;
}

// --- Helper function to get user by Clerk ID ---
const getUserByClerkIdInternal = async (
  ctx: QueryCtx | MutationCtx,
  clerkId: string
) => {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();
};

// Get user by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Retrieves the user record and their profile for the currently authenticated Clerk user.
 */
/**
 * Get a profile by its ID (for internal use)
 */
export const getProfile = query({
  args: { id: v.id("profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.id);
    if (!profile) {
      throw new Error(`Profile with ID ${args.id} not found`);
    }
    return profile;
  },
});

/**
 * Retrieves the user record and their profile for the currently authenticated Clerk user.
 */
export const getCurrentUserWithProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Not authenticated or token is invalid
      return null;
    }

    const user = await getUserByClerkIdInternal(ctx, identity.subject);

    if (!user) {
      // This can happen if the Clerk webhook for user creation hasn't fired yet
      // or if there was an issue creating the user record in Convex.
      console.warn(
        `User with Clerk ID ${identity.subject} not found in Convex DB. Waiting for webhook or check webhook logs.`
      );
      return null;
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    // Ensure profileImageIds is included in the response
    const profileWithImages = profile
      ? {
          ...profile,
          profileImageIds: profile.profileImageIds || [],
          profileImageUrls: profile.profileImageUrls || [],
        }
      : null;

    return { ...user, profile: profileWithImages }; // Profile might not exist if webhook created user but not profile yet
  },
});

/**
 * Internal mutation to create or update a user from a Clerk webhook.
 * This should ONLY be called by an HTTP action triggered by Clerk.
 * Ensures user exists in Convex and a basic profile record is created.
 */
export const internalUpsertUser = internalMutation(
  async (
    ctx,
    {
      clerkId,
      email,
      role,
      fullName,
    }: {
      clerkId: string;
      email: string;
      role?: string;
      fullName?: string;
    }
  ) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    let userId;

    if (existingUser) {
      userId = existingUser._id;
      const update: Partial<User> = { email };
      if (role && existingUser.role !== role) update.role = role;
      if (existingUser.email !== email || update.role) {
        await ctx.db.patch(userId, update);
      }
    } else {
      // Defensive: check again before insert (handles race conditions)
      const doubleCheck = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
        .unique();
      if (doubleCheck) {
        userId = doubleCheck._id;
        const update: Partial<User> = { email };
        if (role && doubleCheck.role !== role) update.role = role;
        if (doubleCheck.email !== email || update.role) {
          await ctx.db.patch(userId, update);
        }
      } else {
        userId = await ctx.db.insert("users", { clerkId, email, role });
      }
    }

    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!existingProfile) {
      // Insert with broad type casting to avoid compile-time literal mismatches

      await ctx.db.insert("profiles", {
        userId,
        clerkId,
        email,
        isProfileComplete: false,
        isOnboardingComplete: false,

        createdAt: Date.now(),
        profileFor: "self",
        // Initialize other fields as undefined or with defaults if necessary
        fullName: fullName,
        dateOfBirth: undefined,
        subscriptionPlan: "free",
      } as any);
      console.log(`Created new profile for user ${userId}`);
    } else {
      const profileUpdates: any = {};
      if (!existingProfile.clerkId || existingProfile.clerkId !== clerkId) {
        profileUpdates.clerkId = clerkId;
      }
      if (existingProfile.email !== email) {
        profileUpdates.email = email;
      }
      if (fullName && !existingProfile.fullName) {
        profileUpdates.fullName = fullName;
      }
      if (existingProfile.isOnboardingComplete === undefined) {
        profileUpdates.isOnboardingComplete = false;
      }
      if (existingProfile.isProfileComplete === undefined) {
        profileUpdates.isProfileComplete = false;
      }

      if (existingProfile.subscriptionPlan === undefined) {
        profileUpdates.subscriptionPlan = "free";
      }
      if (Object.keys(profileUpdates).length > 0) {
        await ctx.db.patch(existingProfile._id, profileUpdates);
      }
      // If profile exists but createdAt is missing (e.g. old data), patch it.
      // This is less likely if all new profiles get it, but good for data integrity.
      if (existingProfile.createdAt === undefined) {
        await ctx.db.patch(existingProfile._id, { createdAt: Date.now() });
      }
    }

    return userId;
  }
);

/**
 * Updates the profile for the currently authenticated user.
 */
export const updateProfile = mutation({
  args: {
    updates: v.object({
      fullName: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      gender: v.optional(
        v.union(v.literal("male"), v.literal("female"), v.literal("other"))
      ),
      city: v.optional(v.string()),
      aboutMe: v.optional(v.string()),
      religion: v.optional(v.string()),
      occupation: v.optional(v.string()),
      education: v.optional(v.string()),
      height: v.optional(v.string()),
      maritalStatus: v.optional(
        v.union(
          v.literal("single"),
          v.literal("divorced"),
          v.literal("widowed"),
          v.literal("annulled")
        )
      ),
      smoking: v.optional(
        v.union(
          v.literal("no"),
          v.literal("occasionally"),
          v.literal("yes"),
          v.literal("")
        )
      ),
      drinking: v.optional(
        v.union(v.literal("no"), v.literal("occasionally"), v.literal("yes"))
      ),
      profileImageIds: v.optional(v.array(v.id("_storage"))),
      isProfileComplete: v.optional(v.boolean()),
      country: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
      annualIncome: v.optional(v.union(v.number(), v.string(), v.literal(""))),
      diet: v.optional(
        v.union(
          v.literal("vegetarian"),
          v.literal("non-vegetarian"),
          v.literal("vegan"),
          v.literal("eggetarian"),
          v.literal("other"),
          v.literal("")
        )
      ),
      physicalStatus: v.optional(
        v.union(
          v.literal("normal"),
          v.literal("differently-abled"),
          v.literal("other"),
          v.literal("")
        )
      ),
      partnerPreferenceAgeMin: v.optional(
        v.union(v.string(), v.number(), v.literal(""))
      ),
      partnerPreferenceAgeMax: v.optional(
        v.union(v.string(), v.number(), v.literal(""))
      ),
      partnerPreferenceCity: v.optional(v.array(v.string())),
      preferredGender: v.optional(
        v.union(
          v.literal("male"),
          v.literal("female"),
          v.literal("any"),
          v.literal("other")
        )
      ),
      updatedAt: v.optional(v.number()),
      // Subscription related fields
      subscriptionPlan: v.optional(
        v.union(
          v.literal("free"),
          v.literal("premium"),
          v.literal("premiumPlus")
        )
      ),
      subscriptionExpiresAt: v.optional(v.number()),
      boostsRemaining: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, message: "Not authenticated" };
    }

    // Find user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return { success: false, message: "User not found in Convex" };
    }

    // Find profile by user ID
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) {
      return { success: false, message: "Profile not found" };
    }

    // Use a temporary mutable object to allow transformation before final typing

    const mutableUpdates: any = { ...args.updates };

    // Ensure annualIncome is stored as a number if provided as string
    if (typeof mutableUpdates.annualIncome === "string") {
      const parsedIncome = parseInt(mutableUpdates.annualIncome, 10);
      if (isNaN(parsedIncome)) {
        delete mutableUpdates.annualIncome;
      } else {
        mutableUpdates.annualIncome = parsedIncome;
      }
    }

    const processedUpdates: Partial<Omit<Profile, "_id">> = mutableUpdates;

    // Ensure updatedAt is always set on any profile modification
    processedUpdates.updatedAt = Date.now();

    try {
      // Recalculate isProfileComplete and isOnboardingComplete

      const updatedProfile = { ...profile, ...processedUpdates } as any;
      let allEssentialFilled2 = true;
      for (const field of [
        "fullName",
        "dateOfBirth",
        "gender",
        "city",
        "aboutMe",
      ]) {
        const value = updatedProfile[field];
        if (
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "")
        ) {
          allEssentialFilled2 = false;
          break;
        }
      }
      const images2 = updatedProfile.profileImageIds;
      const hasImage2 = Array.isArray(images2) && images2.length > 0;
      if (allEssentialFilled2 && hasImage2) {
        processedUpdates.isProfileComplete = true;
        (
          processedUpdates as Partial<Omit<Profile, "_id">> & {
            isOnboardingComplete?: boolean;
          }
        ).isOnboardingComplete = true;
      } else {
        processedUpdates.isProfileComplete = false;
        (
          processedUpdates as Partial<Omit<Profile, "_id">> & {
            isOnboardingComplete?: boolean;
          }
        ).isOnboardingComplete = false;
      }

      // Update the profile
      await ctx.db.patch(profile._id, processedUpdates);

      return {
        success: true,
        message: "Profile updated successfully",
      };
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      return { success: false, message: "Failed to update profile" };
    }
  },
});

/**
 * Retrieves a user's public profile information.
 * This is for displaying profiles to other users. Filter sensitive information.
 */
export const getUserPublicProfile = query({
  args: { userId: v.id("users") }, // Or use clerkId: v.string() if you want to query by that
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      console.warn(
        `Public profile query: User with Convex ID ${args.userId} not found.`
      );
      return null;
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!profile) {
      console.warn(
        `Public profile query: Profile for user ${user._id} not found.`
      );
      return null;
    }

    if (profile.banned === true) {
      // Hide banned profiles from the frontend
      return null;
    }

    // Explicitly list fields to return for public view to ensure privacy
    return {
      // User-related info (be cautious)
      // clerkId: user.clerkId, // Usually not public
      // email: user.email, // Usually not public

      // Profile-related info
      profile: {
        fullName: profile.fullName,
        city: profile.city,
        height: profile.height,
        maritalStatus: profile.maritalStatus,
        education: profile.education,
        occupation: profile.occupation,
        aboutMe: profile.aboutMe,
        profileImageIds: profile.profileImageIds,
        profileImageUrls: profile.profileImageUrls,
        createdAt: profile.createdAt, // Useful for 'Member since'
      },
    };
  },
});

// Block a user
export const blockUser = mutation({
  args: {
    blockerUserId: v.id("users"),
    blockedUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.blockerUserId === args.blockedUserId)
      throw new Error("Cannot block yourself");
    // Prevent duplicate blocks
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerUserId", args.blockerUserId))
      .collect();
    const existing = blocks.find(
      (block) => block.blockedUserId === args.blockedUserId
    );
    if (existing) return { success: true };
    await ctx.db.insert("blocks", {
      blockerUserId: args.blockerUserId,
      blockedUserId: args.blockedUserId,
      createdAt: Date.now(),
    });
    return { success: true };
  },
});

// Unblock a user
export const unblockUser = mutation({
  args: {
    blockerUserId: v.id("users"),
    blockedUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerUserId", args.blockerUserId))
      .collect();
    const block = blocks.find(
      (block) => block.blockedUserId === args.blockedUserId
    );
    if (block) await ctx.db.delete(block._id);
    return { success: true };
  },
});

// Check if a user has blocked another
export const isBlocked = query({
  args: {
    blockerUserId: v.id("users"),
    blockedUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerUserId", args.blockerUserId))
      .collect();
    const block = blocks.find(
      (block) => block.blockedUserId === args.blockedUserId
    );
    return !!block;
  },
});

export const batchGetPublicProfiles = action({
  args: { userIds: v.array(v.id("users")) },
  handler: async (
    ctx,
    args
  ): Promise<Array<{ userId: Id<"users">; profile: PublicProfile }>> => {
    if (!args.userIds.length) {
      // Return all public, complete, not-hidden, not-banned profiles
      const users = await ctx.runQuery(api.users.listUsersWithProfiles, {
        preferredGender: "any",
      });
      // users is an array of user objects with .profile attached
      return users
        .filter(
          (user: User & { profile: Profile | null }) =>
            user.role !== "admin" &&
            user.banned !== true &&
            user.profile &&
            user.profile.profileFor !== undefined &&
            user.profile.isProfileComplete === true &&
            user.profile.banned !== true
        )
        .map((user) => ({
          userId: user._id,
          profile: user.profile! as PublicProfile,
        }));
    }
    // Otherwise, return only the specified users
    const results: Array<{
      userId: Id<"users">;
      profile: PublicProfile;
    } | null> = await Promise.all(
      args.userIds.map(async (userId) => {
        const res: { profile: PublicProfile } | null = await ctx.runQuery(
          api.users.getUserPublicProfile,
          { userId }
        );
        return res && res.profile ? { userId, profile: res.profile } : null;
      })
    );
    return results.filter(Boolean) as Array<{
      userId: Id<"users">;
      profile: PublicProfile;
    }>;
  },
});

// Helper to check admin

// List all profiles (for admin use only)
export const listProfiles = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    return await ctx.db.query("profiles").collect();
  },
});

// Mutation to delete a profile by its _id
export const deleteProfile = mutation({
  args: { id: v.id("profiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    const profile = await ctx.db.get(args.id);
    if (!profile) {
      // Already deleted or never existed
      return { success: true };
    }
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const deleteCurrentUserProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("User not authenticated");
    }

    const user = await getUserByClerkIdInternal(ctx, identity.subject);
    if (!user) {
      throw new ConvexError("User not found in Convex DB");
    }

    const clerkId = user.clerkId; // Store clerkId before potentially deleting user document

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (profile) {
      // Delete associated images from storage
      if (profile.profileImageIds && profile.profileImageIds.length > 0) {
        try {
          await Promise.all(
            profile.profileImageIds.map((imageId) =>
              ctx.storage.delete(imageId)
            )
          );
          console.log(
            `Deleted ${profile.profileImageIds.length} images for profile ${profile._id}`
          );
        } catch (error) {
          console.error(
            `Error deleting images for profile ${profile._id}:`,
            error
          );
          // Non-fatal, continue with profile and user deletion
        }
      }
      // Delete the profile document
      await ctx.db.delete(profile._id);
      console.log(
        `Successfully deleted profile ${profile._id} for user ${user._id}`
      );
    } else {
      console.log(`No profile found for user ${user._id} to delete.`);
    }

    // Delete the user document from Convex
    await ctx.db.delete(user._id);
    console.log(
      `Successfully deleted user ${user._id} (Clerk ID: ${clerkId}) from Convex DB.`
    );

    // Schedule an action to delete the user from Clerk
    await ctx.scheduler.runAfter(0, internal.users.internalDeleteClerkUser, {
      clerkId: clerkId,
    });

    return {
      success: true,
      message:
        "Profile and user deletion from Convex initiated. Clerk deletion scheduled.",
    };
  },
});

// Internal action to delete user from Clerk
export const internalDeleteClerkUser = internalAction({
  args: { clerkId: v.string() },
  handler: async (_ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error(
        "CLERK_SECRET_KEY environment variable not set. Cannot delete user from Clerk."
      );
      // Not throwing an error here as the Convex part is done.
      // The user will be orphaned in Clerk but deleted from the app.
      return {
        success: false,
        message:
          "Clerk secret key not configured. User not deleted from Clerk.",
      };
    }

    const clerkUserId = args.clerkId;
    // Ensure this URL is correct as per Clerk API v1 documentation
    const clerkApiUrl = `https://api.clerk.com/v1/users/${clerkUserId}`;

    console.log(
      `Attempting to delete user ${clerkUserId} from Clerk via API: ${clerkApiUrl}`
    );

    try {
      const response = await fetch(clerkApiUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json", // Though not strictly necessary for DELETE with no body
        },
      });

      if (response.ok) {
        // const responseBody = await response.json(); // Clerk delete might return a body
        console.log(
          `Successfully deleted user ${clerkUserId} from Clerk. Status: ${response.status}`
        );
        return {
          success: true,
          message: "User successfully deleted from Clerk.",
        };
      } else {
        const errorBodyText = await response.text(); // Read as text first
        let errorBodyJson = null;
        try {
          errorBodyJson = JSON.parse(errorBodyText);
        } catch (e) {
          console.error("errorBodyText:", e);
          // ignore if not json
        }
        console.error(
          `Failed to delete user ${clerkUserId} from Clerk. Status: ${response.status} ${response.statusText}. Body:`,
          errorBodyJson || errorBodyText
        );
        return {
          success: false,
          message: `Clerk API error: ${response.status} ${response.statusText}`,
          details: errorBodyJson || errorBodyText,
        };
      }
    } catch (e) {
      console.error(
        `Network or other error when trying to delete user ${clerkUserId} from Clerk:`,
        e
      );
      return {
        success: false,
        message: "Failed to communicate with Clerk API.",
        details: e instanceof Error ? e.message : String(e),
      };
    }
  },
});

export const adminUpdateProfile = mutation({
  args: {
    id: v.id("profiles"),
    updates: v.object({
      fullName: v.optional(v.string()),
      city: v.optional(v.string()),
      gender: v.optional(
        v.union(v.literal("male"), v.literal("female"), v.literal("other"))
      ),
      dateOfBirth: v.optional(v.string()),
      height: v.optional(v.string()),
      maritalStatus: v.optional(
        v.union(
          v.literal("single"),
          v.literal("divorced"),
          v.literal("widowed"),
          v.literal("annulled")
        )
      ),
      education: v.optional(v.string()),
      occupation: v.optional(v.string()),
      annualIncome: v.optional(v.union(v.number(), v.string(), v.literal(""))),
      aboutMe: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
      diet: v.optional(
        v.union(
          v.literal("vegetarian"),
          v.literal("non-vegetarian"),
          v.literal("vegan"),
          v.literal("eggetarian"),
          v.literal("other"),
          v.literal("")
        )
      ),
      smoking: v.optional(
        v.union(
          v.literal("no"),
          v.literal("occasionally"),
          v.literal("yes"),
          v.literal("")
        )
      ),
      drinking: v.optional(
        v.union(v.literal("no"), v.literal("occasionally"), v.literal("yes"))
      ),
      physicalStatus: v.optional(
        v.union(
          v.literal("normal"),
          v.literal("differently-abled"),
          v.literal("other"),
          v.literal("")
        )
      ),
      partnerPreferenceAgeMin: v.optional(
        v.union(v.string(), v.number(), v.literal(""))
      ),
      partnerPreferenceAgeMax: v.optional(
        v.union(v.string(), v.number(), v.literal(""))
      ),
      partnerPreferenceCity: v.optional(v.array(v.string())),
      profileImageIds: v.optional(v.array(v.id("_storage"))),
      isProfileComplete: v.optional(v.boolean()),
      isOnboardingComplete: v.optional(v.boolean()),
      banned: v.optional(v.boolean()),
      country: v.optional(v.string()),
      preferredGender: v.optional(
        v.union(
          v.literal("male"),
          v.literal("female"),
          v.literal("any"),
          v.literal("other")
        )
      ),
      updatedAt: v.optional(v.number()),
      // Subscription related fields
      subscriptionPlan: v.optional(
        v.union(
          v.literal("free"),
          v.literal("premium"),
          v.literal("premiumPlus")
        )
      ),
      subscriptionExpiresAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    // Use a temporary mutable object to allow transformation before final typing

    const mutableAdminUpdates: any = { ...args.updates };

    if (typeof mutableAdminUpdates.annualIncome === "string") {
      const parsedIncome = parseInt(mutableAdminUpdates.annualIncome, 10);
      if (isNaN(parsedIncome)) {
        delete mutableAdminUpdates.annualIncome;
      } else {
        mutableAdminUpdates.annualIncome = parsedIncome;
      }
    }

    const processedUpdates: Partial<Omit<Profile, "_id">> = mutableAdminUpdates;

    const updatesWithTimestamp = {
      ...processedUpdates,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(args.id, updatesWithTimestamp);
    const updatedProfile = await ctx.db.get(args.id);

    return updatedProfile; // Return the full updated profile
  },
});

/**
 * Fetch a profile by its _id (for admin use)
 */
export const getProfileById = query({
  args: { id: v.id("profiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    const profile = await ctx.db.get(args.id);
    return profile;
  },
});

/**
 * Get all mutual matches for a profile (admin use)
 * Returns an array of profile objects that are mutual matches with the given profile
 */
export const getMatchesForProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    // Get the profile
    const profile = await ctx.db.get(args.profileId);
    if (!profile) return [];
    const userId = profile.userId;
    // Get all interests sent and received by this user
    const sent = await ctx.db
      .query("interests")
      .withIndex("by_from_to", (q) => q.eq("fromUserId", userId))
      .collect();
    const received = await ctx.db
      .query("interests")
      .withIndex("by_to", (q) => q.eq("toUserId", userId))
      .collect();
    // Find mutual matches: both users have accepted each other's interest
    const acceptedSent = sent.filter((i) => i.status === "accepted");
    const acceptedReceived = received.filter((i) => i.status === "accepted");
    const mutualUserIds = acceptedSent
      .map((i) => i.toUserId)
      .filter((id) => acceptedReceived.some((r) => r.fromUserId === id));
    // Get profiles for these userIds
    const allProfiles = await ctx.db.query("profiles").collect();
    const matches = allProfiles.filter((p) => mutualUserIds.includes(p.userId));
    return matches;
  },
});

/**
 * Admin: List profiles with search and pagination
 */
export const adminListProfiles = query({
  args: {
    search: v.optional(v.string()),
    page: v.number(),
    pageSize: v.number(),
  },
  handler: async (ctx, { search, page, pageSize }) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    // Fetch all profiles and users
    let allProfiles = await ctx.db.query("profiles").collect();
    const users = await ctx.db.query("users").collect();

    // Only include complete profiles (example: must have fullName, city, religion, phoneNumber)
    allProfiles = allProfiles.filter(
      (p) =>
        p.fullName &&
        p.city &&
        p.phoneNumber &&
        typeof p.fullName === "string" &&
        typeof p.city === "string" &&
        typeof p.phoneNumber === "string"
    );

    // Apply search filter if provided
    if (search && search.trim() !== "") {
      const s = search.trim().toLowerCase();
      allProfiles = allProfiles.filter((p) => {
        const user = users.find((u) => u._id === p.userId);
        return (
          (p.fullName && p.fullName.toLowerCase().includes(s)) ||
          (p.city && p.city.toLowerCase().includes(s)) ||
          (p.phoneNumber && p.phoneNumber.toLowerCase().includes(s)) ||
          (user && user.email && user.email.toLowerCase().includes(s))
        );
      });
    }

    // Sort: boosted profiles first (boostedUntil in future), then by creation date desc
    const now = Date.now();
    allProfiles.sort((a, b) => {
      const aBoost = a.boostedUntil && a.boostedUntil > now;
      const bBoost = b.boostedUntil && b.boostedUntil > now;

      if (aBoost && !bBoost) return -1;
      if (!aBoost && bBoost) return 1;

      const aTime = a.createdAt || 0;
      const bTime = b.createdAt || 0;
      return bTime - aTime;
    });
    console.log("allProfiles:", allProfiles);
    const total = allProfiles.length;
    const safePage = Math.max(1, page);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    const profiles = allProfiles.slice(start, end);

    return { profiles, total, page, pageSize };
  },
});

export const banUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    await ctx.db.patch(userId, { banned: true });
    // Optionally ban profile too
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.patch(profile._id, { banned: true });
    return { success: true };
  },
});

export const unbanUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    await ctx.db.patch(userId, { banned: false });
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.patch(profile._id, { banned: false });
    return { success: true };
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    // Delete profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.delete(profile._id);
    // Delete user
    await ctx.db.delete(userId);
    return { success: true };
  },
});

export const listUsersWithProfiles = query({
  args: {
    preferredGender: v.optional(
      v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("other"),
        v.literal("any")
      )
    ),
  },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const profiles = await ctx.db.query("profiles").collect();
    let filtered = users
      .filter((user) => user.role !== "admin") // Exclude admins
      .map((user) => ({
        ...user,
        profile:
          profiles.find((p) => p.userId === user._id && p.banned !== true) ||
          null,
      }));
    if (args.preferredGender && args.preferredGender !== "any") {
      filtered = filtered.filter(
        (u) => u.profile && u.profile.gender === args.preferredGender
      );
    }
    return filtered;
  },
});

export const userCounts = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const profiles = await ctx.db.query("profiles").collect();
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    return {
      totalUsers: users.length,
      bannedUsers: users.filter((u) => u.banned).length,
      completedProfiles: profiles.filter((p) => p.isProfileComplete).length,
      newThisWeek: users.filter((u) => u._creationTime > weekAgo).length,
      newThisMonth: users.filter((u) => u._creationTime > monthAgo).length,
    };
  },
});

export const updateProfileImageOrder = mutation({
  args: {
    userId: v.id("users"),
    imageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, { userId, imageIds }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Not authenticated" };
    }
    // Only allow updating your own profile
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || user._id !== userId) {
      return { success: false, error: "Unauthorized" };
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) {
      return { success: false, error: "Profile not found" };
    }
    await ctx.db.patch(profile._id, { profileImageIds: imageIds });
    return { success: true };
  },
});

export const createProfile = mutation({
  args: {
    profileFor: v.optional(
      v.union(v.literal("self"), v.literal("friend"), v.literal("family"))
    ),
    fullName: v.string(),
    dateOfBirth: v.string(),
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
    city: v.string(),
    aboutMe: v.string(),
    height: v.string(),
    maritalStatus: v.union(
      v.literal("single"),
      v.literal("divorced"),
      v.literal("widowed"),
      v.literal("annulled")
    ),
    education: v.string(),
    occupation: v.string(),
    profileImageIds: v.optional(v.array(v.id("_storage"))),
    isProfileComplete: v.optional(v.boolean()),
    preferredGender: v.optional(
      v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("other"),
        v.literal("any")
      )
    ),
    smoking: v.optional(
      v.union(
        v.literal("no"),
        v.literal("occasionally"),
        v.literal("yes"),
        v.literal("")
      )
    ),
    drinking: v.optional(
      v.union(v.literal("no"), v.literal("occasionally"), v.literal("yes"))
    ),
    // Subscription related fields
    subscriptionPlan: v.optional(
      v.union(v.literal("free"), v.literal("premium"), v.literal("premiumPlus"))
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, message: "Not authenticated" };
    }

    // Find user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return { success: false, message: "User not found in Convex" };
    }

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (existingProfile) {
      return { success: false, message: "Profile already exists" };
    }

    // Create new profile
    const profileData: Omit<Profile, "_id"> = {
      ...args,
      userId: user._id,
      clerkId: identity.subject,
      email: user.email,
      isProfileComplete: args.isProfileComplete ?? false,

      createdAt: Date.now(),
      updatedAt: Date.now(),
      profileFor: args.profileFor || "self",
      fullName: args.fullName || "",
      dateOfBirth: args.dateOfBirth || "",
      gender: args.gender || "",
      preferredGender: args.preferredGender || "",
      city: args.city || "",
      aboutMe: args.aboutMe || "",
      height: args.height || "",
      maritalStatus: args.maritalStatus || "single",
      education: args.education || "",
      occupation: args.occupation || "",
      profileImageIds: args.profileImageIds || [],
      subscriptionPlan: args.subscriptionPlan || "free",
      subscriptionExpiresAt:
        args.subscriptionPlan && args.subscriptionPlan !== "free"
          ? Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
          : undefined,
    };

    // Mark as complete if all essential fields are filled AND at least one image is present
    const essentialFields = [
      "fullName",
      "dateOfBirth",
      "gender",
      "city",
      "aboutMe",
    ];
    let allEssentialFilled = true;

    const profileDataForCheck = profileData as any;
    for (const field of essentialFields) {
      const value = profileDataForCheck[field];
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "")
      ) {
        allEssentialFilled = false;
        break;
      }
    }
    // Check for at least one image
    const images =
      profileDataForCheck.profileImageUrls ||
      profileDataForCheck.profileImageIds;
    const hasImage = Array.isArray(images) && images.length > 0;
    if (allEssentialFilled && hasImage) {
      profileData.isProfileComplete = true;
      (
        profileData as Partial<Omit<Profile, "_id">> & {
          isOnboardingComplete?: boolean;
        }
      ).isOnboardingComplete = true;
    } else {
      if (!args.isProfileComplete) {
        profileData.isProfileComplete = false;
      }
      (
        profileData as Partial<Omit<Profile, "_id">> & {
          isOnboardingComplete?: boolean;
        }
      ).isOnboardingComplete = false;
    }

    // Insert the profile with runtime-correct fields; suppress TS strictness
    const profileRecord = {
      createdAt: Date.now(),
      ...profileData,
    };

    const profileId = await ctx.db.insert("profiles", profileRecord as any);

    return {
      success: true,
      profileId,
      message: "Profile created successfully",
    };
  },
});

export const setProfileHiddenFromSearch = mutation({
  args: {
    profileId: v.id("profiles"),
    hidden: v.boolean(),
  },
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    // hiddenFromSearch field removed - this function is no longer needed
    return { success: true };
  },
});

/**
 * Returns all mutual matches for the currently authenticated user (not admin-only).
 */
export const getMyMatches = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];
    
    // Get matches from the matches table
    const matches1 = await ctx.db
      .query("matches")
      .withIndex("by_user1", (q) => q.eq("user1Id", user._id))
      .filter((q) => q.eq(q.field("status"), "matched"))
      .collect();
    
    const matches2 = await ctx.db
      .query("matches")
      .withIndex("by_user2", (q) => q.eq("user2Id", user._id))
      .filter((q) => q.eq(q.field("status"), "matched"))
      .collect();
    
    // Combine and get the other user's profile for each match
    const allMatches = [...matches1, ...matches2];
    const matchProfiles = await Promise.all(
      allMatches.map(async (match) => {
        const otherUserId = match.user1Id === user._id ? match.user2Id : match.user1Id;
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", otherUserId))
          .first();
        
        return profile ? {
          ...profile,
          conversationId: match.conversationId,
          matchedAt: match.createdAt,
          lastActivity: match.lastActivity,
        } : null;
      })
    );
    
    return matchProfiles.filter(Boolean);
  },
});

export type ProfileDetailPageData = {
  currentUser: User | null;
  profileData: PublicProfile | null;
  isBlocked: boolean;
  isMutualInterest: boolean;
  sentInterest: Array<{
    fromUserId: Id<"users">;
    toUserId: Id<"users">;
    status: "pending" | "accepted" | "rejected";
    createdAt: number;
  }>;
  userProfileImages: Array<{
    _id: string;
    storageId: string;
    url: string | null;
    fileName: string;
    uploadedAt: number;
  }>;
  userImages: Record<string, string | null>;
  currentUserProfileImagesData: Array<{
    _id: string;
    storageId: string;
    url: string | null;
    fileName: string;
    uploadedAt: number;
  }>;
  error?: string;
};

export const getProfileDetailPageData = action({
  args: { viewedUserId: v.id("users") },
  handler: async (ctx, { viewedUserId }): Promise<ProfileDetailPageData> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity)
      return {
        currentUser: null,
        profileData: null,
        isBlocked: false,
        isMutualInterest: false,
        sentInterest: [],
        userProfileImages: [],
        userImages: {},
        currentUserProfileImagesData: [],
        error: "Not authenticated",
      };

    // Get current user
    const currentUser: User | null = await ctx.runQuery(
      api.users.getCurrentUserWithProfile,
      {}
    );
    const currentUserId = currentUser?._id as Id<"users"> | undefined;

    // Get public profile for viewed user
    const publicProfileRes: { profile: PublicProfile } | null =
      await ctx.runQuery(api.users.getUserPublicProfile, {
        userId: viewedUserId,
      });
    const profileData: PublicProfile | null = publicProfileRes?.profile ?? null;

    // Blocked status
    let isBlocked: boolean = false;
    let isMutualInterest: boolean = false;
    let sentInterest: Array<{
      fromUserId: Id<"users">;
      toUserId: Id<"users">;
      status: "pending" | "accepted" | "rejected";
      createdAt: number;
    }> = [];

    if (currentUserId && viewedUserId && currentUserId !== viewedUserId) {
      isBlocked = await ctx.runQuery(api.users.isBlocked, {
        blockerUserId: currentUserId,
        blockedUserId: viewedUserId,
      });
      isMutualInterest = await ctx.runQuery(api.interests.isMutualInterest, {
        userA: currentUserId,
        userB: viewedUserId,
      });
      sentInterest = await ctx.runQuery(api.interests.getSentInterests, {
        userId: currentUserId,
      });
    }

    // Images for the profile being viewed
    const userProfileImages = await ctx.runQuery(api.images.getProfileImages, {
      userId: viewedUserId,
    });

    // Batch get profile images (for one user)
    const userImages = await ctx.runQuery(api.images.batchGetProfileImages, {
      userIds: [viewedUserId],
    });

    // Images for the current logged-in user
    let currentUserProfileImagesData: Array<{
      _id: string;
      storageId: string;
      url: string | null;
      fileName: string;
      uploadedAt: number;
    }> = [];

    if (currentUserId) {
      currentUserProfileImagesData = await ctx.runQuery(
        api.images.getProfileImages,
        {
          userId: currentUserId,
        }
      );
    }

    return {
      currentUser,
      profileData,
      isBlocked,
      isMutualInterest,
      sentInterest,
      userProfileImages,
      userImages,
      currentUserProfileImagesData,
    };
  },
});

export const searchPublicProfiles = query({
  args: {
    preferredGender: v.optional(
      v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("other"),
        v.literal("any")
      )
    ),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    ageMin: v.optional(v.number()),
    ageMax: v.optional(v.number()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Get all users and profiles
    const users = await ctx.db.query("users").collect();
    const allProfiles = await ctx.db.query("profiles").collect();

    // Join users and profiles
    const usersWithProfiles = users.map((u) => ({
      ...u,
      profile: allProfiles.find((p) => p.userId === u._id) || null,
    }));

    // Filter users based on criteria
    const filteredUsers = usersWithProfiles.filter((u) => {
      // Skip admin users
      if (u.role === "admin") return false;

      // Skip banned users
      if (u.banned) return false;

      // Skip users without profiles
      if (!u.profile) return false;

      // Skip incomplete profiles
      if (!u.profile.isProfileComplete) return false;



      // Skip banned profiles
      if (u.profile.banned) return false;

      // Filter by preferred gender
      if (args.preferredGender && args.preferredGender !== "any") {
        if (u.profile.gender !== args.preferredGender) return false;
      }

      // Filter by city
      if (args.city && args.city !== "any") {
        if (u.profile.city !== args.city) return false;
      }

      // Filter by country
      if (args.country && args.country !== "any") {
        if (u.profile.country !== args.country) return false;
      }

      // Filter by age
      if (args.ageMin || args.ageMax) {
        const dob = new Date(u.profile.dateOfBirth || "");
        if (isNaN(dob.getTime())) return false;

        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }

        if (args.ageMin && age < args.ageMin) return false;
        if (args.ageMax && age > args.ageMax) return false;
      }

      return true;
    });

    // Sort: boosted profiles first (boostedUntil in future), then by creation date desc
    const now = Date.now();
    filteredUsers.sort((a, b) => {
      const aBoost = a.profile?.boostedUntil && a.profile.boostedUntil > now;
      const bBoost = b.profile?.boostedUntil && b.profile.boostedUntil > now;

      if (aBoost && !bBoost) return -1;
      if (!aBoost && bBoost) return 1;

      const aTime = a.profile?.createdAt || 0;
      const bTime = b.profile?.createdAt || 0;
      return bTime - aTime;
    });

    // Apply pagination
    const page = args.page || 0;
    const pageSize = args.pageSize || 10;
    const start = page * pageSize;
    const end = start + pageSize;
    const paginatedUsers = filteredUsers.slice(start, end);

    // Map to public profile format
    const searchResults = paginatedUsers.map((u) => {
      const profile = u.profile!; // We know it's not null because of the filter
      return {
        userId: u._id,
        email: u.email,
        profile: {
          fullName: profile.fullName,
          city: profile.city,
          dateOfBirth: profile.dateOfBirth,
          isProfileComplete: profile.isProfileComplete,

          profileImageIds: profile.profileImageIds,
          profileImageUrls: profile.profileImageUrls,
          createdAt: profile.createdAt,
          boostedUntil: profile.boostedUntil,
        },
      };
    });

    return {
      profiles: searchResults,
      total: filteredUsers.length,
    };
  },
});

export const adminUpdateProfileImageOrder = mutation({
  args: {
    profileId: v.id("profiles"),
    imageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, { profileId, imageIds }) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    const profile = await ctx.db.get(profileId);
    if (!profile) {
      throw new Error("Profile not found");
    }
    await ctx.db.patch(profileId, { profileImageIds: imageIds });
    return { success: true };
  },
});

/***********************************
 * Premium Plus: Profile Boost
 ***********************************/
export const boostProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    // Get user & profile
    const user = await getUserByClerkIdInternal(ctx, identity.subject);
    if (!user) throw new ConvexError("User not found");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) throw new ConvexError("Profile not found");

    if (profile.subscriptionPlan !== "premiumPlus") {
      throw new ConvexError("Profile Boost is only available for Premium Plus");
    }

    // Determine if we need to reset monthly quota. We store boostsMonth as a numeric key in
    // the form YYYYMM (e.g., 202406 for June 2024) so it plays nicely with the Convex
    // schema expecting `v.number()`.
    const now = new Date();
    const currentMonthKey =
      now.getUTCFullYear() * 100 + (now.getUTCMonth() + 1); // 202406

    let boostsRemaining = profile.boostsRemaining as number | undefined;
    let boostsMonth = (profile as any).boostsMonth as number | undefined;

    if (boostsMonth !== currentMonthKey) {
      // New month → reset quota to 5
      boostsRemaining = 5;
      boostsMonth = currentMonthKey;
    }

    if ((boostsRemaining ?? 0) <= 0) {
      throw new ConvexError("No boosts remaining this month");
    }

    // Mark boostedUntil for 24 hours and decrement quota
    const updates: Partial<ConvexProfile> = {
      boostsRemaining: (boostsRemaining ?? 0) - 1,
      boostsMonth,
      boostedUntil: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      updatedAt: Date.now(),
    };

    await ctx.db.patch(profile._id, updates as any);

    return { boostsRemaining: (boostsRemaining ?? 0) - 1 };
  },
});

/***********************************
 * Spotlight Badge Management
 ***********************************/

// Grant spotlight badge (Premium/Premium Plus users only)
export const grantSpotlightBadge = mutation({
  args: {
    durationDays: v.optional(v.number()), // Optional duration, defaults to 30 days
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    // Get user & profile
    const user = await getUserByClerkIdInternal(ctx, identity.subject);
    if (!user) throw new ConvexError("User not found");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) throw new ConvexError("Profile not found");

    // Check if user has premium or premium plus subscription
    if (profile.subscriptionPlan !== "premium" && profile.subscriptionPlan !== "premiumPlus") {
      throw new ConvexError("Spotlight badge is only available for Premium and Premium Plus subscribers");
    }

    // Calculate expiration (default 30 days)
    const durationDays = args.durationDays ?? 30;
    const expiresAt = Date.now() + (durationDays * 24 * 60 * 60 * 1000);

    const updates: Partial<ConvexProfile> = {
      hasSpotlightBadge: true,
      spotlightBadgeExpiresAt: expiresAt,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(profile._id, updates as any);

    return { 
      hasSpotlightBadge: true, 
      spotlightBadgeExpiresAt: expiresAt,
      durationDays 
    };
  },
});

// Remove spotlight badge
export const removeSpotlightBadge = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    // Get user & profile
    const user = await getUserByClerkIdInternal(ctx, identity.subject);
    if (!user) throw new ConvexError("User not found");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) throw new ConvexError("Profile not found");

    const updates: Partial<ConvexProfile> = {
      hasSpotlightBadge: false,
      spotlightBadgeExpiresAt: undefined,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(profile._id, updates as any);

    return { hasSpotlightBadge: false };
  },
});

// Admin function to grant spotlight badge to any user
export const adminGrantSpotlightBadge = mutation({
  args: {
    profileId: v.id("profiles"),
    durationDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new ConvexError("Profile not found");

    // Calculate expiration (default 30 days)
    const durationDays = args.durationDays ?? 30;
    const expiresAt = Date.now() + (durationDays * 24 * 60 * 60 * 1000);

    const updates: Partial<ConvexProfile> = {
      hasSpotlightBadge: true,
      spotlightBadgeExpiresAt: expiresAt,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(args.profileId, updates as any);

    return { 
      hasSpotlightBadge: true, 
      spotlightBadgeExpiresAt: expiresAt,
      durationDays 
    };
  },
});

// Admin function to remove spotlight badge from any user
export const adminRemoveSpotlightBadge = mutation({
  args: {
    profileId: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);

    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new ConvexError("Profile not found");

    const updates: Partial<ConvexProfile> = {
      hasSpotlightBadge: false,
      spotlightBadgeExpiresAt: undefined,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(args.profileId, updates as any);

    return { hasSpotlightBadge: false };
  },
});

/***********************************
 * Record Profile View
 ***********************************/
export const recordProfileView = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const viewer = await getUserByClerkIdInternal(ctx, identity.subject);
    if (!viewer) return;

    // Prevent logging self views
    const profile = await ctx.db.get(args.profileId);
    if (!profile || profile.userId === viewer._id) return;

    // Save simple record (allow duplicates, can be deduped in query)
    await ctx.db.insert("profileViews", {
      viewerId: viewer._id,
      profileId: args.profileId,
      createdAt: Date.now(),
    });
  },
});

/***********************************
 * Get viewers list (Premium Plus only)
 ***********************************/
export const getProfileViewers = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const viewerUser = await getUserByClerkIdInternal(ctx, identity.subject);
    if (!viewerUser) return [];

    const profile = await ctx.db.get(args.profileId);
    if (!profile || profile.userId !== viewerUser._id) return [];

    if (profile.subscriptionPlan !== "premiumPlus") return [];

    // Get recent views (last 100)
    const views = await ctx.db
      .query("profileViews")
      .withIndex("by_profileId_createdAt", (q) =>
        q.eq("profileId", args.profileId)
      )
      .order("desc")
      .take(100);

    const viewerIds = Array.from(new Set(views.map((v) => v.viewerId)));

    const users = await Promise.all(viewerIds.map((id) => ctx.db.get(id)));

    return users.filter(Boolean);
  },
});

// --- Stripe subscription helpers ---
export const internalUpdateSubscription = internalMutation(
  async (
    ctx,
    args: {
      clerkId: string;
      plan: "free" | "premium" | "premiumPlus";
      expiresAt?: number;
    }
  ) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) {
      console.error("internalUpdateSubscription: user not found", args.clerkId);
      return;
    }
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!profile) {
      console.error("internalUpdateSubscription: profile not found", user._id);
      return;
    }
    await ctx.db.patch(profile._id, {
      subscriptionPlan: args.plan,
      subscriptionExpiresAt: args.expiresAt ?? undefined,
    });
  }
);

export const stripeUpdateSubscription = action({
  args: {
    clerkId: v.string(),
    plan: v.union(
      v.literal("free"),
      v.literal("premium"),
      v.literal("premiumPlus")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.users.internalUpdateSubscription, {
      clerkId: args.clerkId,
      plan: args.plan,
      expiresAt: Date.now() + 31 * 24 * 60 * 60 * 1000, // extend 31 days
    });
  },
});
