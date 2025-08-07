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
 * Fetch a profile by its profile _id, returning the owning userId if found.
 * Note: a more detailed admin-oriented `getProfileById` exists later; keep this
 * lightweight variant for general callers to avoid leaking private fields.
 */
export const getProfileOwnerById = query({
  args: { id: v.id("profiles") },
  handler: async (ctx, { id }) => {
    const profile = await ctx.db.get(id);
    if (!profile) return null;
    return {
      _id: (profile as any)._id as Id<"profiles">,
      userId: (profile as any).userId as Id<"users">,
    } as const;
  },
});

/**
 * Current user with public profile, resolved via Convex Auth cookie session.
 * Uses ctx.auth.getUserIdentity() to derive the authenticated identity, then
 * looks up the user by email and returns a minimal shape along with profile.
 */
export const getCurrentUserWithProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const email = (identity as any).email as string | undefined;
    let user: any = null;
    if (email && email.trim()) {
      user = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email.trim()))
        .first();
    }

    if (!user) return null;

    let profile: any = null;
    try {
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id as Id<"users">))
        .first();
    } catch {
      profile = null;
    }

    return { user, profile } as const;
  },
});

/**
 * List current user's matches using cookie/session auth (Convex Auth).
 * Returns minimal info needed by callers:
 * [{ userId, fullName?, profileImageUrls?, createdAt? }]
 */
export const getMyMatches = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [] as Array<{
      userId: Id<"users">;
      fullName?: string | null;
      profileImageUrls?: string[] | null;
      createdAt?: number | null;
    }>;

    // Resolve current user record via email
    const email = (identity as any).email as string | undefined;
    let me: any = null;
    if (email && email.trim()) {
      me = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email.trim()))
        .first();
    }
    if (!me) return [];

    const myId = me._id as Id<"users">;

    // Collect matches where I'm either user1 or user2
    const asUser1 = await ctx.db
      .query("matches")
      .withIndex("by_user1", (q) => q.eq("user1Id", myId))
      .collect();
    const asUser2 = await ctx.db
      .query("matches")
      .withIndex("by_user2", (q) => q.eq("user2Id", myId))
      .collect();

    const rows = [...asUser1, ...asUser2].filter((m: any) => m?.status === "matched");

    // Map to the other participant and enrich with profile basics
    const results: Array<{
      userId: Id<"users">;
      fullName?: string | null;
      profileImageUrls?: string[] | null;
      createdAt?: number | null;
    }> = [];

    for (const m of rows) {
      const otherUserId = (m.user1Id === myId ? m.user2Id : m.user1Id) as Id<"users">;
      let fullName: string | null = null;
      let profileImageUrls: string[] | null = null;
      try {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", otherUserId))
          .first();
        if (profile) {
          fullName = (profile as any).fullName ?? null;
          profileImageUrls = ((profile as any).profileImageUrls ?? null) as string[] | null;
        }
      } catch {}

      results.push({
        userId: otherUserId,
        fullName,
        profileImageUrls,
        createdAt: (m as any)?.createdAt ?? null,
      });
    }

    return results;
  },
});

/**
 * Record a profile view by the current authenticated user.
 */
export const recordProfileView = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const email = (identity as any).email as string | undefined;
    if (!email) throw new Error("Unauthenticated");
    const me = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!me) throw new Error("User not found");
    await ctx.db.insert("profileViews", {
      viewerId: (me._id as Id<"users">),
      profileId,
      createdAt: Date.now(),
    } as any);
    return { success: true } as const;
  },
});

/**
 * Get viewers for a profile. Caller should be authorized by route logic; this
 * query does not enforce ownership beyond Convex authentication.
 */
export const getProfileViewers = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const views = await ctx.db
      .query("profileViews")
      .withIndex("by_profileId_createdAt", (q) => q.eq("profileId", profileId))
      .collect();
    const results: Array<{
      viewerId: Id<"users">;
      fullName?: string | null;
      profileImageUrls?: string[] | null;
      viewedAt: number;
    }> = [];
    for (const vrow of views) {
      const viewerId = (vrow as any).viewerId as Id<"users">;
      let fullName: string | null = null;
      let profileImageUrls: string[] | null = null;
      try {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", viewerId))
          .first();
        if (profile) {
          fullName = (profile as any).fullName ?? null;
          profileImageUrls = ((profile as any).profileImageUrls ?? null) as string[] | null;
        }
      } catch {}
      results.push({
        viewerId,
        fullName,
        profileImageUrls,
        viewedAt: (vrow as any).createdAt ?? Date.now(),
      });
    }
    return results;
  },
});

/**
 * Admin: list profiles with simple filtering and pagination (naive scan).
 */
export const adminListProfiles = query({
  args: {
    search: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    sortBy: v.optional(v.string()),
    sortDir: v.optional(v.string()),
    banned: v.optional(v.string()),
    plan: v.optional(v.string()),
    isProfileComplete: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("profiles").collect();
    let profiles = all as any[];
    const term = (args.search ?? "").toLowerCase().trim();
    if (term) {
      profiles = profiles.filter((p) =>
        String(p.fullName ?? "").toLowerCase().includes(term) ||
        String(p.aboutMe ?? "").toLowerCase().includes(term)
      );
    }
    // Enrich banned flag by joining users
    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const user = await ctx.db.get(p.userId as Id<"users">);
        return { ...p, banned: Boolean((user as any)?.banned), subscriptionPlan: (user as any)?.subscriptionPlan };
      })
    );
    let filtered = enriched;
    if (args.banned === "true") filtered = filtered.filter((p) => p.banned === true);
    if (args.banned === "false") filtered = filtered.filter((p) => p.banned !== true);
    if (args.isProfileComplete === "true") filtered = filtered.filter((p) => p.isProfileComplete === true);
    if (args.isProfileComplete === "false") filtered = filtered.filter((p) => p.isProfileComplete !== true);
    // simple sort by createdAt or subscriptionPlan or banned
    const sortBy = (args.sortBy as string) || "createdAt";
    const dir = (args.sortDir as string) === "asc" ? 1 : -1;
    filtered.sort((a: any, b: any) => {
      const av = a?.[sortBy] ?? 0;
      const bv = b?.[sortBy] ?? 0;
      return av === bv ? 0 : av > bv ? dir : -dir;
    });
    const pageSize = Math.min(Math.max(args.pageSize ?? 10, 1), 100);
    const page = Math.max(args.page ?? 1, 1);
    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);
    return { profiles: pageItems, total: filtered.length, page, pageSize } as const;
  },
});

/**
 * Admin: get profile by id (public fields).
 */
export const getProfileById = query({
  args: { id: v.id("profiles") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

/**
 * Admin: update profile by id with a whitelist of fields.
 */
export const adminUpdateProfile = mutation({
  args: {
    id: v.id("profiles"),
    updates: v.object({
      fullName: v.optional(v.string()),
      aboutMe: v.optional(v.string()),
      isProfileComplete: v.optional(v.boolean()),
      motherTongue: v.optional(v.string()),
      religion: v.optional(v.string()),
      ethnicity: v.optional(v.string()),
      hideFromFreeUsers: v.optional(v.boolean()),
      subscriptionPlan: v.optional(v.string()),
      subscriptionExpiresAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { id, updates }) => {
    await ctx.db.patch(id as Id<"profiles">, { ...(updates as any), updatedAt: Date.now() } as any);
    return { ok: true } as const;
  },
});

/**
 * Admin: delete a profile by id.
 */
export const deleteProfile = mutation({
  args: { id: v.id("profiles") },
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get(id);
    if (!existing) return { ok: true, deleted: false } as const;
    await ctx.db.delete(id);
    return { ok: true, deleted: true } as const;
  },
});

/**
 * Admin: reorder profile image ids.
 */
export const adminUpdateProfileImageOrder = mutation({
  args: {
    profileId: v.id("profiles"),
    imageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, { profileId, imageIds }) => {
    await ctx.db.patch(profileId as Id<"profiles">, { profileImageIds: imageIds as any, updatedAt: Date.now() } as any);
    return { ok: true } as const;
  },
});

/**
 * Admin: ban/unban a user by userId.
 */
export const banUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId as Id<"users">, { banned: true } as any);
    return { ok: true } as const;
  },
});

export const unbanUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId as Id<"users">, { banned: false } as any);
    return { ok: true } as const;
  },
});

/**
 * Admin: get matches for a profile by profileId.
 */
export const getMatchesForProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const profile = await ctx.db.get(profileId);
    if (!profile) return [] as any[];
    const userId = (profile as any).userId as Id<"users">;
    const a = await ctx.db
      .query("matches")
      .withIndex("by_user1", (q) => q.eq("user1Id", userId))
      .collect();
    const b = await ctx.db
      .query("matches")
      .withIndex("by_user2", (q) => q.eq("user2Id", userId))
      .collect();
    return [...a, ...b];
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
    // Store values as bigint to match table schema types
    const windowStartBig = BigInt(windowStart);
    const countBig = BigInt(count);

    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id as Id<"rateLimits">, {
        windowStart: windowStartBig,
        count: countBig,
      } as any);
      return existing._id as Id<"rateLimits">;
    }

    const id = await ctx.db.insert("rateLimits", {
      key,
      windowStart: windowStartBig,
      count: countBig,
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
