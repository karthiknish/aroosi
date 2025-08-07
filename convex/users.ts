/* convex/users.ts
 * Convex user helpers referenced by actions via generated api
 * - Query: findUserByEmail (requires index "by_email" on users.email in your Convex schema)
 * - Mutation: createUserAndProfile
 * - Rate limiting helpers and other commonly used queries
 */
import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Query helper: find user by email (uses index 'by_email' on users.email)
 */
export const findUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

/**
 * Alias: getUserByEmail -> delegates to findUserByEmail
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});

/**
 * Mutation helper: create user and default profile
 */
export const createUserAndProfile = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    picture: v.optional(v.string()),
    googleId: v.optional(v.string()),
  },
  handler: async (ctx, { email, name, picture, googleId }) => {
    const userId = await ctx.db.insert("users", {
      email,
      name: name ?? "",
      picture: picture ?? "",
      role: "user",
      createdAt: Date.now(),
      emailVerified: true,
      googleId: googleId ?? undefined,
    } as any);
    await ctx.db.insert("profiles", {
      userId: userId as Id<"users">,
      isProfileComplete: false,
      isOnboardingComplete: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as any);
    return userId as Id<"users">;
  },
});

/**
 * Public profile by userId
 * Requires profiles index "by_userId" (profiles.userId)
 */
export const getProfileByUserIdPublic = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return null;
    // Return only public fields used by callers
    const {
      _id,
      isProfileComplete,
      isOnboardingComplete,
      createdAt,
      updatedAt,
      // include other safe fields as needed
    } = profile as any;
    return {
      _id,
      isProfileComplete: !!isProfileComplete,
      isOnboardingComplete: !!isOnboardingComplete,
      createdAt,
      updatedAt,
    };
  },
});

/**
 * Minimal viable public profile search
 * This is a naive scan; for production use, add appropriate indexes/filters.
 */
export const searchPublicProfiles = query({
  args: {
    term: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { term, limit }) => {
    const max = Math.min(Math.max(limit ?? 20, 1), 100);
    const t = (term ?? "").toLowerCase();
    // naive filter: scan profiles and join with user email/name if needed
    const results: any[] = [];
    const iter = ctx.db.query("profiles"); // add indexes for better perf when needed

    // Convex iterator API: use .collect() in latest versions; else loop over .take()
    const all = (await iter.collect?.()) ?? []; // optional chaining for compatibility
    for (const p of all as any[]) {
      if (!p) continue;
      // Basic text match on fields
      if (!t || `${p.aboutMe ?? ""}`.toLowerCase().includes(t)) {
        results.push({
          _id: p._id,
          userId: p.userId,
          isProfileComplete: !!p.isProfileComplete,
          isOnboardingComplete: !!p.isOnboardingComplete,
        });
        if (results.length >= max) break;
      }
    }
    return results;
  },
});

/**
 * Rate limiting helpers
 * Requires rateLimits table with index "by_key" on key
 * rateLimits: { key: string, windowStart: number, count: number }
 */
export const getRateLimitByKey = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    return await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
  },
});

export const setRateLimitWindow = mutation({
  args: {
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  },
  handler: async (ctx, { key, windowStart, count }) => {
    // Upsert window for key
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id as Id<"rateLimits">, {
        windowStart,
        count,
      });
      return existing._id as Id<"rateLimits">;
    }
    const id = await ctx.db.insert("rateLimits", {
      key,
      windowStart,
      count,
    } as any);
    return id as Id<"rateLimits">;
  },
});

export const incrementRateLimit = mutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (!existing) {
      const id = await ctx.db.insert("rateLimits", {
        key,
        windowStart: BigInt(Date.now()),
        count: BigInt(1),
      } as any);
      return id as Id<"rateLimits">;
    }
    const currentCount = (existing as any).count ?? BigInt(0);
    await ctx.db.patch(
      existing._id as Id<"rateLimits">,
      {
        count:
          (typeof currentCount === "bigint"
            ? currentCount
            : BigInt(Number(currentCount))) + BigInt(1),
      } as any
    );
    return existing._id as Id<"rateLimits">;
  },
});

/**
 * Signup wrapper in case callers expect an action-level function
 */
export const createUserAndProfileViaSignup = action({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    picture: v.optional(v.string()),
    googleId: v.optional(v.string()),
    // Note: hashedPassword/fullName intentionally excluded here to match callers' expected API without schema mismatch
  },
  handler: async (ctx, { email, name, picture, googleId }) => {
    // Use registered functions via runQuery/runMutation; avoid ctx.db in action to keep types consistent
    const one = await ctx.runQuery(findUserByEmail as any, { email });
    if (one) {
      return { ok: true, userId: one._id as Id<"users"> };
    }
    const userId = await ctx.runMutation(createUserAndProfile as any, {
      email,
      name,
      picture,
      googleId,
    });
    return { ok: true, userId: userId as Id<"users"> };
  },
});
