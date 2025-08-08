import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Cache table definition assumed in schema under 'recommendationCache'
// Fallback: store per user dayKey with ranked userIds

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
      .withIndex("by_userId", (q: any) => q.eq("userId", self._id as Id<"users">))
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

    function scoreProfile(p: any): number {
      let s = 0;
      // Mutual constraints
      if (selfCity && p.city && selfCity === String(p.city).toLowerCase()) s += 10;
      const dob = String(p.dateOfBirth || "");
      const year = dob ? parseInt(dob.slice(0, 4)) : NaN;
      const now = new Date().getUTCFullYear();
      const age = now - (Number.isFinite(year) ? year : now);
      if (!Number.isNaN(prefAgeMin) && !Number.isNaN(prefAgeMax) && age >= prefAgeMin && age <= prefAgeMax) s += 10;

      // Activity (proxy): recent messages or profileViews could be used; for now, newer profiles get a small boost
      const createdAt = Number(p.createdAt || 0);
      if (createdAt) {
        const days = Math.max(1, (Date.now() - createdAt) / (1000 * 60 * 60 * 24));
        s += Math.max(0, 10 - Math.floor(days));
      }

      // Profile completeness
      if (p.aboutMe) s += 10;
      if (Array.isArray(p.profileImageUrls) && p.profileImageUrls.length > 0) s += 20;

      // Placeholder for quiz similarity (requires userQuizResults)
      s += 0;
      return s;
    }

    // Apply score, sort, paginate
    const scored = candidates
      .filter((p: any) => String(p.userId) !== String(self._id))
      .map((p: any) => ({ userId: p.userId as Id<"users">, score: scoreProfile(p), p }))
      .sort((a: any, b: any) => b.score - a.score);

    // Basic offset cursor using a stringified number
    const start = cursor ? parseInt(cursor, 10) || 0 : 0;
    const slice = scored.slice(start, start + limit);
    const nextCursor = start + limit < scored.length ? String(start + limit) : null;

    const items = slice.map((s) => ({ userId: s.userId, score: s.score }));

    return { items, nextCursor } as const;
  },
});

// Internal mutation to invalidate cache entries (placeholder)
export const invalidateRecommendations = internalMutation({
  args: { userId: v.id("users") },
  handler: async (_ctx, _args) => {
    // No-op for now; wire to a recommendationCache table if added later
    return { ok: true } as const;
  },
});
