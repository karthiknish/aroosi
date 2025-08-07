import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Query a profile by userId
 */
export const getProfileByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Update selected profile fields for the given userId.
 * Only mutates provided keys; updates updatedAt timestamp.
 */
export const updateProfileFields = mutation({
  args: {
    userId: v.id("users"),
    updates: v.object({
      fullName: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      gender: v.optional(v.string()),
      city: v.optional(v.string()),
      country: v.optional(v.string()),
      aboutMe: v.optional(v.string()),
      religion: v.optional(v.string()),
      motherTongue: v.optional(v.string()),
      ethnicity: v.optional(v.string()),
      occupation: v.optional(v.string()),
      education: v.optional(v.string()),
      height: v.optional(v.string()),
      maritalStatus: v.optional(v.string()),
      smoking: v.optional(v.string()),
      drinking: v.optional(v.string()),
      diet: v.optional(v.string()),
      physicalStatus: v.optional(v.string()),
      profileImageIds: v.optional(v.array(v.id("_storage"))),
      isProfileComplete: v.optional(v.boolean()),
      phoneNumber: v.optional(v.string()),
      annualIncome: v.optional(v.union(v.string(), v.number())),
      partnerPreferenceAgeMin: v.optional(v.number()),
      partnerPreferenceAgeMax: v.optional(v.number()),
      partnerPreferenceCity: v.optional(v.array(v.string())),
      preferredGender: v.optional(v.string()),
      profileFor: v.optional(v.string()),
      hideFromFreeUsers: v.optional(v.boolean()),
      subscriptionPlan: v.optional(v.string()),
      subscriptionExpiresAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { userId, updates }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) {
      throw new Error("Profile not found");
    }

    // Build patch payload with only defined keys
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) {
        patch[k] = v;
      }
    }

    await ctx.db.patch(profile._id as Id<"profiles">, patch as any);
    return { ok: true };
  },
});

/**
 * Delete profile document for a given userId.
 * Does not delete the user record; use a users-level mutation if needed.
 */
export const deleteProfile = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) {
      // Idempotent: treat as success
      return { ok: true, deleted: false };
    }

    await ctx.db.delete(profile._id as Id<"profiles">);
    return { ok: true, deleted: true };
  },
});
