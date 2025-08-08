import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

function utcDayKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0")
  );
}

async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const email = (identity as any).email as string | undefined;
  if (!email) return null;
  const me = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email.trim().toLowerCase()))
    .first();
  return me;
}

export const getQuickPicks = query({
  args: { dayKey: v.optional(v.string()) },
  handler: async (ctx, { dayKey }) => {
    const me = await getCurrentUser(ctx);
    if (!me) return [] as Id<"users">[];
    const day = dayKey && dayKey.length === 8 ? dayKey : utcDayKey();
    const existing = await ctx.db
      .query("userDailyQuickPicks")
      .withIndex("by_user_day", (q: any) => q.eq("userId", me._id).eq("dayKey", day))
      .first();
    return (existing?.picks as Id<"users">[] | undefined) ?? [];
  },
});

export const ensureQuickPicks = mutation({
  args: { dayKey: v.optional(v.string()) },
  handler: async (ctx, { dayKey }) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Unauthenticated");
    const day = dayKey && dayKey.length === 8 ? dayKey : utcDayKey();
    const existing = await ctx.db
      .query("userDailyQuickPicks")
      .withIndex("by_user_day", (q: any) => q.eq("userId", me._id).eq("dayKey", day))
      .first();
    if (existing) return (existing as any).picks as Id<"users">[];

    // Sample candidates (naive): newest profiles excluding me
    const allProfiles = await ctx.db.query("profiles").withIndex("by_createdAt").collect();
    const candidates: Id<"users">[] = [];
    for (const p of allProfiles as any[]) {
      if (String(p.userId) === String(me._id)) continue;
      if (p.banned || !p.isProfileComplete) continue;
      candidates.push(p.userId as Id<"users">);
      if (candidates.length >= 200) break; // cap
    }

    // Determine plan limit (read from profile)
    const myProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", me._id as Id<"users">))
      .first();
    const plan = (myProfile as any)?.subscriptionPlan || "free";
    const limit = plan === "premiumPlus" ? 40 : plan === "premium" ? 20 : 5;

    // Simple random sample
    const picks: Id<"users">[] = [];
    for (let i = 0; i < candidates.length && picks.length < limit; i++) {
      const j = Math.floor(Math.random() * candidates.length);
      const uid = candidates[j];
      if (!picks.includes(uid)) picks.push(uid);
    }

    await ctx.db.insert("userDailyQuickPicks", {
      userId: me._id as Id<"users">,
      dayKey: day,
      picks,
      createdAt: Date.now(),
    } as any);
    return picks;
  },
});

export const actOnQuickPick = mutation({
  args: {
    toUserId: v.id("users"),
    action: v.union(v.literal("like"), v.literal("skip")),
  },
  handler: async (ctx, { toUserId, action }) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Unauthenticated");
    if (String(me._id) === String(toUserId)) {
      return { success: false, code: "SELF_NOT_ALLOWED" } as const;
    }
    // Write action
    await ctx.db.insert("userLikesSkips", {
      fromUserId: me._id as Id<"users">,
      toUserId,
      action,
      source: "quickpick",
      createdAt: Date.now(),
    } as any);
    return { success: true } as const;
  },
});

export const getQuickPickProfiles = query({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, { userIds }) => {
    const results: Array<{
      userId: Id<"users">;
      fullName?: string | null;
      city?: string | null;
      imageUrl?: string | null;
    }> = [];
    for (const uid of userIds as Id<"users">[]) {
      let fullName: string | null = null;
      let city: string | null = null;
      let imageUrl: string | null = null;
      try {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q: any) => q.eq("userId", uid))
          .first();
        if (profile) {
          fullName = (profile as any).fullName ?? null;
          city = (profile as any).city ?? null;
          const urls = (profile as any).profileImageUrls as string[] | undefined;
          imageUrl = Array.isArray(urls) && urls.length > 0 ? (urls[0] as string) : null;
        }
      } catch {}
      results.push({ userId: uid, fullName, city, imageUrl });
    }
    return results;
  },
});


