"use strict";
import {
  internalMutation,
  query,
  mutation,
  type QueryCtx,
  type MutationCtx,
  action,
} from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { requireAdmin } from "./utils/requireAdmin";
import { checkRateLimit } from "./utils/rateLimit";

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

    return { ...user, profile: profile || null }; // Profile might not exist if webhook created user but not profile yet
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
    { clerkId, email, role }: { clerkId: string; email: string; role?: string }
  ) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    let userId;

    if (existingUser) {
      userId = existingUser._id;
      const update: any = { email };
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
        const update: any = { email };
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
      await ctx.db.insert("profiles", {
        userId,
        clerkId,
        isProfileComplete: false,
        createdAt: Date.now(),
        // Initialize other fields as undefined or with defaults if necessary
        fullName: undefined,
        dateOfBirth: undefined,
      });
      console.log(`Created new profile for user ${userId}`);
    } else {
      if (!existingProfile.clerkId) {
        await ctx.db.patch(existingProfile._id, { clerkId });
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
    fullName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(
      v.union(v.literal("male"), v.literal("female"), v.literal("other"))
    ),
    ukCity: v.optional(v.string()),
    ukPostcode: v.optional(v.string()),
    religion: v.optional(v.string()),
    caste: v.optional(v.string()),
    motherTongue: v.optional(v.string()),
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
    annualIncome: v.optional(v.number()),
    aboutMe: v.optional(v.string()),
    partnerPreferenceAgeMin: v.optional(v.number()),
    partnerPreferenceAgeMax: v.optional(v.number()),
    partnerPreferenceReligion: v.optional(v.array(v.string())),
    partnerPreferenceUkCity: v.optional(v.array(v.string())),
    profileImageIds: v.optional(v.array(v.id("_storage"))),
    // New fields for lifestyle/contact
    phoneNumber: v.optional(v.string()),
    diet: v.optional(
      v.union(
        v.literal("vegetarian"),
        v.literal("non-vegetarian"),
        v.literal("vegan"),
        v.literal("eggetarian"),
        v.literal("other")
      )
    ),
    smoking: v.optional(
      v.union(v.literal("no"), v.literal("occasionally"), v.literal("yes"))
    ),
    drinking: v.optional(
      v.union(v.literal("no"), v.literal("occasionally"), v.literal("yes"))
    ),
    physicalStatus: v.optional(
      v.union(
        v.literal("normal"),
        v.literal("differently-abled"),
        v.literal("other")
      )
    ),
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
    const identity = await ctx.auth.getUserIdentity();
    const rateKey = `users:updateProfile:${identity?.subject || "anon"}`;
    const rate = await checkRateLimit(ctx.db, rateKey);
    if (!rate.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rate.retryAfter || 0) / 1000)} seconds.`,
      };
    }

    if (!identity) {
      return { success: false, message: "Not authenticated" };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) {
      return { success: false, message: "User not found in Convex" };
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) {
      return { success: false, message: "Profile not found for user" };
    }

    let newProfileCompleteStatus = profile.isProfileComplete;
    // Check essential fields only if profile is not already marked complete
    if (
      profile.isProfileComplete === false ||
      profile.isProfileComplete === undefined
    ) {
      const essentialFields = [
        "fullName",
        "dateOfBirth",
        "gender",
        "ukCity",
        "aboutMe",
      ];
      let allEssentialFilled = true;

      const tempProfileDataForCheck = { ...profile, ...args }; // Combine existing and new data for check

      for (const field of essentialFields) {
        const value =
          tempProfileDataForCheck[
            field as keyof typeof tempProfileDataForCheck
          ];
        if (
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "")
        ) {
          allEssentialFilled = false;
          break;
        }
      }
      if (allEssentialFilled) {
        newProfileCompleteStatus = true;
      }
    }

    const updatePayload: any = { ...args }; // Start with args
    if (newProfileCompleteStatus !== profile.isProfileComplete) {
      updatePayload.isProfileComplete = newProfileCompleteStatus;
    }

    // Ensure updatedAt is always set on any profile modification
    updatePayload.updatedAt = Date.now();

    try {
      await ctx.db.patch(profile._id, updatePayload);
      return {
        success: true,
        message: "Profile updated successfully",
        isProfileComplete: newProfileCompleteStatus,
      };
    } catch (error) {
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
        ukCity: profile.ukCity,
        religion: profile.religion,
        motherTongue: profile.motherTongue,
        height: profile.height,
        maritalStatus: profile.maritalStatus,
        education: profile.education,
        occupation: profile.occupation,
        aboutMe: profile.aboutMe,
        profileImageIds: profile.profileImageIds, // Assuming these are safe and you handle their URLs correctly
        createdAt: profile.createdAt, // Useful for 'Member since'
        // Explicitly DO NOT include: dateOfBirth, ukPostcode, caste (unless desired for your community),
        // annualIncome, partner preferences, or other sensitive details.
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
  ): Promise<Array<{ userId: Id<"users">; profile: any }>> => {
    if (!args.userIds.length) {
      // Return all public, complete, not-hidden, not-banned profiles
      const users = await ctx.runQuery(api.users.listUsersWithProfiles, {
        preferredGender: "any",
      });
      // users is an array of user objects with .profile attached
      return users
        .filter(
          (user: any) =>
            user.role !== "admin" &&
            user.banned !== true &&
            user.profile &&
            user.profile.isProfileComplete === true &&
            user.profile.hiddenFromSearch !== true &&
            user.profile.banned !== true
        )
        .map((user: any) => ({ userId: user._id, profile: user.profile }));
    }
    // Otherwise, return only the specified users
    const results: Array<{ userId: Id<"users">; profile: any } | null> =
      await Promise.all(
        args.userIds.map(async (userId) => {
          const res: { profile: any } | null = await ctx.runQuery(
            api.users.getUserPublicProfile,
            { userId }
          );
          return res && res.profile ? { userId, profile: res.profile } : null;
        })
      );
    return results.filter(Boolean) as Array<{
      userId: Id<"users">;
      profile: any;
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
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const adminUpdateProfile = mutation({
  args: {
    id: v.id("profiles"),
    updates: v.object({
      fullName: v.optional(v.string()),
      ukCity: v.optional(v.string()),
      gender: v.optional(
        v.union(v.literal("male"), v.literal("female"), v.literal("other"))
      ),
      dateOfBirth: v.optional(v.string()),
      religion: v.optional(v.string()),
      caste: v.optional(v.string()),
      motherTongue: v.optional(v.string()),
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
      annualIncome: v.optional(v.number()),
      aboutMe: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
      diet: v.optional(
        v.union(
          v.literal("vegetarian"),
          v.literal("non-vegetarian"),
          v.literal("vegan"),
          v.literal("eggetarian"),
          v.literal("other")
        )
      ),
      smoking: v.optional(
        v.union(v.literal("no"), v.literal("occasionally"), v.literal("yes"))
      ),
      drinking: v.optional(
        v.union(v.literal("no"), v.literal("occasionally"), v.literal("yes"))
      ),
      physicalStatus: v.optional(
        v.union(
          v.literal("normal"),
          v.literal("differently-abled"),
          v.literal("other")
        )
      ),
      partnerPreferenceAgeMin: v.optional(v.number()),
      partnerPreferenceAgeMax: v.optional(v.number()),
      partnerPreferenceReligion: v.optional(v.array(v.string())),
      partnerPreferenceUkCity: v.optional(v.array(v.string())),
      profileImageIds: v.optional(v.array(v.id("_storage"))),
      banned: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    await ctx.db.patch(args.id, args.updates);
    return { success: true };
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
    let allProfiles = await ctx.db.query("profiles").collect();
    // Join with user emails if needed
    const users = await ctx.db.query("users").collect();
    if (search && search.trim() !== "") {
      const s = search.trim().toLowerCase();
      allProfiles = allProfiles.filter((p) => {
        const user = users.find((u) => u._id === p.userId);
        return (
          (p.fullName && p.fullName.toLowerCase().includes(s)) ||
          (p.ukCity && p.ukCity.toLowerCase().includes(s)) ||
          (p.religion && p.religion.toLowerCase().includes(s)) ||
          (p.phoneNumber && p.phoneNumber.toLowerCase().includes(s)) ||
          (user && user.email && user.email.toLowerCase().includes(s))
        );
      });
    }
    // Sort by createdAt desc
    allProfiles = allProfiles.sort(
      (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
    );
    const total = allProfiles.length;
    const start = page * pageSize;
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
    fullName: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(
      v.union(v.literal("male"), v.literal("female"), v.literal("other"))
    ),
    ukCity: v.optional(v.string()),
    ukPostcode: v.optional(v.string()),
    religion: v.optional(v.string()),
    caste: v.optional(v.string()),
    motherTongue: v.optional(v.string()),
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
    annualIncome: v.optional(v.number()),
    aboutMe: v.optional(v.string()),
    partnerPreferenceAgeMin: v.optional(v.number()),
    partnerPreferenceAgeMax: v.optional(v.number()),
    partnerPreferenceReligion: v.optional(v.array(v.string())),
    partnerPreferenceUkCity: v.optional(v.array(v.string())),
    profileImageIds: v.optional(v.array(v.id("_storage"))),
    phoneNumber: v.optional(v.string()),
    diet: v.optional(
      v.union(
        v.literal("vegetarian"),
        v.literal("non-vegetarian"),
        v.literal("vegan"),
        v.literal("eggetarian"),
        v.literal("other")
      )
    ),
    smoking: v.optional(
      v.union(v.literal("no"), v.literal("occasionally"), v.literal("yes"))
    ),
    drinking: v.optional(
      v.union(v.literal("no"), v.literal("occasionally"), v.literal("yes"))
    ),
    physicalStatus: v.optional(
      v.union(
        v.literal("normal"),
        v.literal("differently-abled"),
        v.literal("other")
      )
    ),
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
    const profileData: any = {
      ...args,
      userId: user._id,
      clerkId: identity.subject,
      email: user.email,
      isProfileComplete: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Mark as complete if all essential fields are filled
    const essentialFields = [
      "fullName",
      "dateOfBirth",
      "gender",
      "ukCity",
      "aboutMe",
    ];
    let allEssentialFilled = true;
    for (const field of essentialFields) {
      const value = profileData[field];
      if (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "")
      ) {
        allEssentialFilled = false;
        break;
      }
    }
    if (allEssentialFilled) {
      profileData.isProfileComplete = true;
    }

    await ctx.db.insert("profiles", profileData);

    return { success: true, message: "Profile created successfully" };
  },
});

export const setProfileHiddenFromSearch = mutation({
  args: {
    profileId: v.id("profiles"),
    hidden: v.boolean(),
  },
  handler: async (ctx, { profileId, hidden }) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    await ctx.db.patch(profileId, { hiddenFromSearch: hidden });
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
    // Get all interests sent and received by this user
    const sent = await ctx.db
      .query("interests")
      .withIndex("by_from_to", (q) => q.eq("fromUserId", user._id))
      .collect();
    const received = await ctx.db
      .query("interests")
      .withIndex("by_to", (q) => q.eq("toUserId", user._id))
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

type ProfileDetailPageData = {
  currentUser: any;
  profileData: any;
  isBlocked: boolean;
  isMutualInterest: boolean;
  sentInterest: any[];
  userProfileImages: any;
  userImages: any;
  currentUserProfileImagesData: any[];
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
    const currentUser: any = await ctx.runQuery(
      api.users.getCurrentUserWithProfile,
      {}
    );
    const currentUserId = currentUser?._id as Id<"users"> | undefined;
    // Get public profile for viewed user
    const profileData: any = await ctx.runQuery(
      api.users.getUserPublicProfile,
      { userId: viewedUserId }
    );
    // Blocked status
    let isBlocked: boolean = false;
    let isMutualInterest: boolean = false;
    let sentInterest: any[] = [];
    if (currentUserId && viewedUserId && currentUserId !== viewedUserId) {
      isBlocked = await ctx.runQuery(api.users.isBlocked, {
        blockerUserId: currentUserId as Id<"users">,
        blockedUserId: viewedUserId as Id<"users">,
      });
      isMutualInterest = await ctx.runQuery(api.interests.isMutualInterest, {
        userA: currentUserId as Id<"users">,
        userB: viewedUserId as Id<"users">,
      });
      sentInterest = await ctx.runQuery(api.interests.getSentInterests, {
        userId: currentUserId as Id<"users">,
      });
    }
    // Images for the profile being viewed
    const userProfileImages: any = await ctx.runQuery(
      api.images.getProfileImages,
      {
        userId: viewedUserId as Id<"users">,
      }
    );
    // Batch get profile images (for one user)
    const userImages: any = await ctx.runQuery(
      api.images.batchGetProfileImages,
      {
        userIds: [viewedUserId as Id<"users">],
      }
    );
    // Images for the current logged-in user
    let currentUserProfileImagesData: any[] = [];
    if (currentUserId) {
      currentUserProfileImagesData = await ctx.runQuery(
        api.images.getProfileImages,
        {
          userId: currentUserId as Id<"users">,
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
