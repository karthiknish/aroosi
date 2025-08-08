import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Toggle shortlist entry for current user -> toUserId.
 */
export const toggleShortlist = mutation({
  args: { toUserId: v.id("users") },
  handler: async (ctx, { toUserId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const email = (identity as any).email as string | undefined;
    if (!email) throw new Error("Unauthenticated");

    const me = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .first();
    if (!me) throw new Error("User not found");

    if (String(me._id) === String(toUserId)) {
      return { success: false, code: "SELF_NOT_ALLOWED" } as const;
    }

    // Look for existing entry
    const existing = await ctx.db
      .query("shortlists")
      .withIndex("by_user_to", (q) =>
        q.eq("userId", me._id as Id<"users">).eq("toUserId", toUserId)
      )
      .first();
    if (existing) {
      await ctx.db.delete((existing as any)._id as Id<"shortlists">);
      return { success: true, removed: true } as const;
    }

    // Enforce plan-based limits before adding
    const myProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", me._id as Id<"users">))
      .first();
    const plan = (myProfile as any)?.subscriptionPlan || "free";
    const shortlistLimit = plan === "premiumPlus" ? Number.POSITIVE_INFINITY : plan === "premium" ? 200 : 20;
    if (!Number.isFinite(shortlistLimit)) {
      // unlimited for premiumPlus
    } else {
      const current = await ctx.db
        .query("shortlists")
        .withIndex("by_user", (q: any) => q.eq("userId", me._id as Id<"users">))
        .collect();
      if ((current?.length ?? 0) >= shortlistLimit) {
        return { success: false, code: "SHORTLIST_LIMIT", limit: shortlistLimit } as const;
      }
    }
    await ctx.db.insert("shortlists", {
      userId: me._id as Id<"users">,
      toUserId,
      createdAt: Date.now(),
    } as any);
    return { success: true, added: true } as const;
  },
});

/**
 * List current user's shortlists with minimal profile info for display.
 */
export const listMyShortlists = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [] as Array<{
      userId: Id<"users">;
      fullName?: string | null;
      profileImageUrls?: string[] | null;
      createdAt: number;
    }>;
    const email = (identity as any).email as string | undefined;
    if (!email) return [] as any[];

    const me = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .first();
    if (!me) return [] as any[];

    const rows = await ctx.db
      .query("shortlists")
      .withIndex("by_user", (q) => q.eq("userId", me._id as Id<"users">))
      .collect();

    const results: Array<{
      userId: Id<"users">;
      fullName?: string | null;
      profileImageUrls?: string[] | null;
      createdAt: number;
    }> = [];

    for (const row of rows as any[]) {
      const otherId = row.toUserId as Id<"users">;
      let fullName: string | null = null;
      let profileImageUrls: string[] | null = null;
      try {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", otherId))
          .first();
        if (profile) {
          fullName = (profile as any).fullName ?? null;
          profileImageUrls = ((profile as any).profileImageUrls ?? null) as string[] | null;
        }
      } catch {}
      results.push({
        userId: otherId,
        fullName,
        profileImageUrls,
        createdAt: (row as any).createdAt ?? Date.now(),
      });
    }

    return results;
  },
});

/**
 * Upsert a private note for another user.
 */
export const setNote = mutation({
  args: { toUserId: v.id("users"), note: v.string() },
  handler: async (ctx, { toUserId, note }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const email = (identity as any).email as string | undefined;
    if (!email) throw new Error("Unauthenticated");

    const me = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .first();
    if (!me) throw new Error("User not found");

    if (String(me._id) === String(toUserId)) {
      return { success: false, code: "SELF_NOT_ALLOWED" } as const;
    }

    const existing = await ctx.db
      .query("notes")
      .withIndex("by_user_to", (q) =>
        q.eq("userId", me._id as Id<"users">).eq("toUserId", toUserId)
      )
      .first();
    if (existing) {
      await ctx.db.patch((existing as any)._id as Id<"notes">, {
        note,
        updatedAt: Date.now(),
      } as any);
      return { success: true, updated: true } as const;
    }

    // Enforce plan-based limits for notes count (one-per-user ensures per-target unique)
    const myProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", me._id as Id<"users">))
      .first();
    const plan = (myProfile as any)?.subscriptionPlan || "free";
    const notesLimit = plan === "premiumPlus" ? Number.POSITIVE_INFINITY : plan === "premium" ? 200 : 20;
    if (Number.isFinite(notesLimit)) {
      const current = await ctx.db
        .query("notes")
        .withIndex("by_user_to", (q: any) => q.eq("userId", me._id as Id<"users">))
        .collect();
      if ((current?.length ?? 0) >= notesLimit) {
        return { success: false, code: "NOTES_LIMIT", limit: notesLimit } as const;
      }
    }
    await ctx.db.insert("notes", {
      userId: me._id as Id<"users">,
      toUserId,
      note,
      updatedAt: Date.now(),
    } as any);
    return { success: true, created: true } as const;
  },
});

/**
 * Get note for a specific other user (if exists).
 */
export const getNoteFor = query({
  args: { toUserId: v.id("users") },
  handler: async (ctx, { toUserId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const email = (identity as any).email as string | undefined;
    if (!email) return null;

    const me = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .first();
    if (!me) return null;

    const row = await ctx.db
      .query("notes")
      .withIndex("by_user_to", (q) =>
        q.eq("userId", me._id as Id<"users">).eq("toUserId", toUserId)
      )
      .first();
    if (!row) return null;
    return { note: (row as any).note as string, updatedAt: (row as any).updatedAt as number } as const;
  },
});


