import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

function dayKey(ts = Date.now()): string {
  const d = new Date(ts);
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0")
  );
}

async function getMe(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const email = (identity as any).email as string | undefined;
  if (!email) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email.trim().toLowerCase()))
    .first();
}

export const getDailyQuestions = query({
  args: {},
  handler: async (ctx) => {
    // rotate by day key to vary selection
    const key = dayKey();
    const all = await ctx.db.query("icebreakerQuestions").withIndex("by_active", (q: any) => q.eq("active", true)).collect();
    if (!all || all.length === 0) return [] as Array<{ id: string; text: string }>; 
    // simple deterministic shuffle by day key
    const seed = parseInt(key.slice(-4), 10) || 1;
    const arr = [...(all as any[])];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (seed + i * 13) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, Math.min(3, arr.length)).map((q) => ({ id: String(q._id), text: q.text as string }));
  },
});

export const answerIcebreaker = mutation({
  args: { questionId: v.string(), answer: v.string() },
  handler: async (ctx, { questionId, answer }) => {
    const me = await getMe(ctx);
    if (!me) throw new Error("Unauthenticated");
    // upsert per user+question
    const existing = await ctx.db
      .query("userIcebreakerAnswers")
      .withIndex("by_user_question", (q: any) => q.eq("userId", me._id as Id<"users">).eq("questionId", questionId))
      .first();
    if (existing) {
      await ctx.db.patch((existing as any)._id as Id<"userIcebreakerAnswers">, {
        answer,
        createdAt: Date.now(),
      } as any);
      return { success: true, updated: true } as const;
    }
    await ctx.db.insert("userIcebreakerAnswers", {
      userId: me._id as Id<"users">,
      questionId,
      answer,
      createdAt: Date.now(),
    } as any);
    return { success: true, created: true } as const;
  },
});


