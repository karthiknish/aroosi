import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Cache table definition assumed in schema under 'recommendationCache'
// Fallback: store per user dayKey with ranked userIds

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) s += a[i] * b[i];
  return s;
}
function norm(a: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s);
}
function cosineSim(a: number[], b: number[]): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

export const getRecommendations = query({
  args: { cursor: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { cursor, limit = 20 }) => {
    const me = await ctx.auth.getUserIdentity();
    if (!me) return { items: [], nextCursor: null } as const;
    const email = (me as any).email as string | undefined;
    if (!email) return { items: [], nextCursor: null } as const;

    const self = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", email.toLowerCase()))
      .first();
    if (!self) return { items: [], nextCursor: null } as const;

    const selfProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) =>
        q.eq("userId", self._id as Id<"users">)
      )
      .first();

    // Simple heuristic scoring over candidate profiles
    const candidates = await ctx.db
      .query("profiles")
      .withIndex("by_createdAt", (q: any) => q.gt("createdAt", 0))
      .collect();

    // Build a normalized preference set for quick scoring
    const selfCity = (selfProfile?.city || "").toString().toLowerCase();
    const prefAgeMin = Number(selfProfile?.partnerPreferenceAgeMin ?? NaN);
    const prefAgeMax = Number(selfProfile?.partnerPreferenceAgeMax ?? NaN);

    // Load quiz traits for cosine similarity
    const selfQuiz = await ctx.db
      .query("userQuizResults")
      .withIndex("by_userId", (q: any) =>
        q.eq("userId", self._id as Id<"users">)
      )
      .first();
    const selfVector: number[] = (() => {
      const t = (selfQuiz as any)?.traits;
      if (t && typeof t === "object") {
        // stable key order for vector
        const keys = Object.keys(t).sort();
        return keys.map((k) => {
          const v = (t as any)[k];
          return typeof v === "number" ? v : 0;
        });
      }
      return [];
    })();

    function baseScore(p: any): number {
      let s = 0;
      // Mutual constraints
      if (selfCity && p.city && selfCity === String(p.city).toLowerCase())
        s += 10;
      const dob = String(p.dateOfBirth || "");
      const year = dob ? parseInt(dob.slice(0, 4)) : NaN;
      const now = new Date().getUTCFullYear();
      const age = now - (Number.isFinite(year) ? year : now);
      if (
        !Number.isNaN(prefAgeMin) &&
        !Number.isNaN(prefAgeMax) &&
        age >= prefAgeMin &&
        age <= prefAgeMax
      )
        s += 10;

      // Activity (proxy): recent messages or profileViews could be used; for now, newer profiles get a small boost
      const createdAt = Number(p.createdAt || 0);
      if (createdAt) {
        const days = Math.max(
          1,
          (Date.now() - createdAt) / (1000 * 60 * 60 * 24)
        );
        s += Math.max(0, 10 - Math.floor(days));
      }

      // Profile completeness
      if (p.aboutMe) s += 10;
      if (Array.isArray(p.profileImageUrls) && p.profileImageUrls.length > 0)
        s += 20;
      return s;
    }

    // Resolve block lists for viewer and filter
    const viewerUserId = self._id as Id<"users">;
    const blockedUserIds = new Set<string>();
    try {
      const [blocked, blockedBy] = await Promise.all([
        ctx.db
          .query("blocks")
          .withIndex("by_blocker", (ix: any) =>
            ix.eq("blockerUserId", viewerUserId)
          )
          .collect(),
        ctx.db
          .query("blocks")
          .withIndex("by_blocked", (ix: any) =>
            ix.eq("blockedUserId", viewerUserId)
          )
          .collect(),
      ]);
      for (const b of blocked as any[])
        blockedUserIds.add(String(b.blockedUserId));
      for (const b of blockedBy as any[])
        blockedUserIds.add(String(b.blockerUserId));
    } catch {}

    // Resolve matches to avoid recommending already-matched users
    const matchedUserIds = new Set<string>();
    try {
      const [m1, m2] = await Promise.all([
        ctx.db
          .query("matches")
          .withIndex("by_user1", (ix: any) => ix.eq("user1Id", viewerUserId))
          .collect(),
        ctx.db
          .query("matches")
          .withIndex("by_user2", (ix: any) => ix.eq("user2Id", viewerUserId))
          .collect(),
      ]);
      for (const m of [...(m1 as any[]), ...(m2 as any[])]) {
        if ((m as any).status === "matched") {
          const other =
            String((m as any).user1Id) === String(viewerUserId)
              ? String((m as any).user2Id)
              : String((m as any).user1Id);
          matchedUserIds.add(other);
        }
      }
    } catch {}

    // Resolve recent likes/skips to avoid resurfacing very recent decisions (e.g., last 7 days)
    const decidedUserIds = new Set<string>();
    try {
      const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const actions = await ctx.db
        .query("userLikesSkips")
        .withIndex("by_from_createdAt", (ix: any) =>
          ix.eq("fromUserId", viewerUserId)
        )
        .collect();
      for (const a of actions as any[]) {
        const ts = Number(a.createdAt || a._creationTime || 0);
        if (ts >= since) decidedUserIds.add(String(a.toUserId));
      }
    } catch {}

    // Feature gate: hideFromFreeUsers, allow if viewer is premium
    const viewerPlan = (selfProfile as any)?.subscriptionPlan as
      | string
      | undefined;

    // Apply filters before scoring
    const filtered = (candidates as any[]).filter((p: any) => {
      const otherId = String(p.userId);
      if (otherId === String(self._id)) return false;
      if (blockedUserIds.has(otherId)) return false;
      if (matchedUserIds.has(otherId)) return false;
      if (decidedUserIds.has(otherId)) return false;
      if (
        p.hideFromFreeUsers &&
        viewerPlan !== "premium" &&
        viewerPlan !== "premiumPlus"
      )
        return false;
      return true;
    });
    const scored = await Promise.all(
      filtered.map(async (p: any) => {
        let s = baseScore(p);
        if (selfVector.length > 0 && p.userId) {
          try {
            const otherQuiz = await ctx.db
              .query("userQuizResults")
              .withIndex("by_userId", (q: any) => q.eq("userId", p.userId))
              .first();
            const t = (otherQuiz as any)?.traits;
            if (t && typeof t === "object") {
              const keys = Object.keys(t).sort();
              const otherVector = keys.map((k) =>
                typeof (t as any)[k] === "number" ? (t as any)[k] : 0
              );
              const maxLen = Math.max(selfVector.length, otherVector.length);
              const a = selfVector.concat(
                Array(Math.max(0, maxLen - selfVector.length)).fill(0)
              );
              const b = otherVector.concat(
                Array(Math.max(0, maxLen - otherVector.length)).fill(0)
              );
              const sim = cosineSim(a, b);
              s += Math.floor(sim * 30);
            }
          } catch {}
        }
        return { userId: p.userId as Id<"users">, score: s, p };
      })
    );
    scored.sort((a: any, b: any) => b.score - a.score);

    // Basic offset cursor using a stringified number
    const start = cursor ? parseInt(cursor, 10) || 0 : 0;
    const slice = scored.slice(start, start + limit);
    const nextCursor =
      start + limit < scored.length ? String(start + limit) : null;

    // Enrich minimal profile cards inline (or could call quickPicks.getQuickPickProfiles)
    const items = await Promise.all(
      slice.map(async (s) => {
        let fullName: string | null = null;
        let city: string | null = null;
        let imageUrl: string | null = null;
        try {
          const prof = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q: any) => q.eq("userId", s.userId))
            .first();
          if (prof) {
            fullName = (prof as any).fullName ?? null;
            city = (prof as any).city ?? null;
            const urls = (prof as any).profileImageUrls as string[] | undefined;
            imageUrl =
              Array.isArray(urls) && urls.length > 0
                ? (urls[0] as string)
                : null;
          }
        } catch {}
        return { userId: s.userId, score: s.score, fullName, city, imageUrl };
      })
    );

    return { items, nextCursor } as const;
  },
});

// Internal mutation to invalidate cache entries (placeholder)
export const invalidateRecommendations = mutation({
  args: { userId: v.id("users") },
  handler: async (_ctx, _args) => {
    // No-op for now; wire to a recommendationCache table if added later
    return { ok: true } as const;
  },
});
