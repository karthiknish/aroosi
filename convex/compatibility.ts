import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const getCompatibility = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await ctx.auth.getUserIdentity();
    if (!me) return { score: null, reasons: ["unauthenticated"] } as const;

    // Lookup self and target profiles
    const email = (me as any).email as string | undefined;
    const self = email
      ? await ctx.db.query("users").withIndex("by_email", (q: any) => q.eq("email", email.toLowerCase())).first()
      : null;
    if (!self) return { score: null, reasons: ["no-self"] } as const;

    const selfProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", self._id as Id<"users">))
      .first();
    const targetProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first();

    if (!targetProfile) return { score: null, reasons: ["no-target-profile"] } as const;

    // Light heuristic: age range fit + city match + gender preference match + quiz similarity placeholder
    let score = 0;
    const reasons: string[] = [];

    // City match adds points
    if (
      selfProfile?.city &&
      targetProfile?.city &&
      String(selfProfile.city).toLowerCase() === String(targetProfile.city).toLowerCase()
    ) {
      score += 20;
      reasons.push("city");
    }

    // Preferred gender matching (symmetric): if both have prefs and each matches the other
    const selfPref = selfProfile?.preferredGender as string | undefined;
    const tgtGender = targetProfile?.gender as string | undefined;
    if (!selfPref || selfPref === "any" || (tgtGender && selfPref === tgtGender)) {
      score += 20;
      reasons.push("gender");
    }

    // Age window check if set on self
    const min = Number(selfProfile?.partnerPreferenceAgeMin ?? NaN);
    const max = Number(selfProfile?.partnerPreferenceAgeMax ?? NaN);
    if (!Number.isNaN(min) && !Number.isNaN(max)) {
      // crude age estimate from dateOfBirth yyyy-mm-dd
      const dob = String(targetProfile?.dateOfBirth || "");
      const year = dob ? parseInt(dob.slice(0, 4)) : NaN;
      const now = new Date().getUTCFullYear();
      const age = now - (Number.isFinite(year) ? year : now);
      if (age >= min && age <= max) {
        score += 20;
        reasons.push("age");
      }
    }

    // Quiz similarity placeholder: if both have a userQuizResults row, add points (future: real cosine)
    const [selfQuiz, targetQuiz] = await Promise.all([
      ctx.db.query("userQuizResults").withIndex("by_userId", (q: any) => q.eq("userId", self._id as Id<"users">)).first(),
      ctx.db.query("userQuizResults").withIndex("by_userId", (q: any) => q.eq("userId", userId)).first(),
    ]);
    if (selfQuiz && targetQuiz) {
      score += 20;
      reasons.push("quiz");
    }

    // Profile completeness check (simple): aboutMe + at least one image url
    if (targetProfile?.aboutMe && (Array.isArray(targetProfile.profileImageUrls) && targetProfile.profileImageUrls.length > 0)) {
      score += 20;
      reasons.push("completeness");
    }

    // Clamp 0..100
    if (score < 0) score = 0;
    if (score > 100) score = 100;
    return { score, reasons } as const;
  },
});
