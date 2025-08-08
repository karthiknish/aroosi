import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAdmin } from "./utils/requireAdmin";

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
    .withIndex("by_email", (q: any) =>
      q.eq("email", email.trim().toLowerCase())
    )
    .first();
}

function startOfUtcDay(ts = Date.now()): number {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// Deterministic PRNG from a numeric seed (mulberry32-like)
function seededRandom(seed: number): () => number {
  let t = seed + 0x6d2b79f5;
  return () => {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const getDailyQuestions = query({
  args: {},
  handler: async (ctx) => {
    // rotate by day key to vary selection
    const key = dayKey();
    const all = await ctx.db
      .query("icebreakerQuestions")
      .withIndex("by_active", (q: any) => q.eq("active", true))
      .collect();
    if (!all || all.length === 0)
      return [] as Array<{ id: string; text: string; answered?: boolean }>;

    // Weighted, deterministic sampling of up to 3 active questions
    const seedNum = Number.parseInt(key, 10) || Date.now();
    const rand = seededRandom(seedNum);
    const candidates = (all as any[]).map((q) => ({
      id: String(q._id),
      text: String(q.text || ""),
      weight: typeof q.weight === "number" && q.weight > 0 ? q.weight : 1,
    }));

    const pickCount = Math.min(3, candidates.length);
    const picked: Array<{ id: string; text: string }> = [];
    const pool = [...candidates];
    for (let k = 0; k < pickCount; k++) {
      const totalW = pool.reduce((s, q) => s + (q.weight as number), 0);
      let r = rand() * totalW;
      let idx = 0;
      for (; idx < pool.length; idx++) {
        r -= pool[idx].weight as number;
        if (r <= 0) break;
      }
      const chosen = pool.splice(Math.min(idx, pool.length - 1), 1)[0];
      if (chosen) picked.push({ id: chosen.id, text: chosen.text });
    }

    // Mark answered status for today (UTC)
    const me = await getMe(ctx);
    if (!me) return picked.map((q) => ({ ...q, answered: false }));
    const since = startOfUtcDay();
    const answeredFlags = new Map<string, boolean>();
    for (const q of picked) answeredFlags.set(q.id, false);
    const answers = await ctx.db
      .query("userIcebreakerAnswers")
      .withIndex("by_user", (ix: any) => ix.eq("userId", me._id as Id<"users">))
      .collect();
    for (const a of answers as any[]) {
      if (answeredFlags.has(String(a.questionId))) {
        const ts = Number(a.createdAt || a._creationTime || 0);
        if (ts >= since) answeredFlags.set(String(a.questionId), true);
      }
    }
    return picked.map((q) => ({ ...q, answered: !!answeredFlags.get(q.id) }));
  },
});

export const answerIcebreaker = mutation({
  args: { questionId: v.string(), answer: v.string() },
  handler: async (ctx, { questionId, answer }) => {
    const me = await getMe(ctx);
    if (!me) throw new Error("Unauthenticated");

    // Basic validation
    const val = String(answer || "").trim();
    if (val.length === 0) throw new Error("Answer cannot be empty");
    if (val.length > 500) throw new Error("Answer too long (max 500)");

    // Check question exists and is active
    const qRow = await ctx.db
      .get(questionId as unknown as Id<"icebreakerQuestions">)
      .catch(() => null);
    if (!qRow || (qRow as any).active === false)
      throw new Error("Invalid question");

    // Simple rate limit: 10 answers per 60s per user
    try {
      const key = `icebreaker_answer:user:${String(me._id)}`;
      const now = Date.now();
      const WINDOW = 60_000;
      const MAX = 10;
      const existingRl = await ctx.db
        .query("rateLimits")
        .withIndex("by_key", (ix: any) => ix.eq("key", key))
        .first();
      const toNum = (v: unknown) =>
        typeof v === "number" ? v : typeof v === "bigint" ? Number(v) : 0;
      if (
        !existingRl ||
        now - toNum((existingRl as any).windowStart) > WINDOW
      ) {
        // reset window
        if (existingRl)
          await ctx.db.delete((existingRl as any)._id as Id<"rateLimits">);
        await ctx.db.insert("rateLimits", {
          key,
          windowStart: now,
          count: 1,
        } as any);
      } else {
        const next = toNum((existingRl as any).count) + 1;
        if (next > MAX)
          throw new Error("Rate limit exceeded. Please wait a bit.");
        await ctx.db.patch(
          (existingRl as any)._id as Id<"rateLimits">,
          { count: next } as any
        );
      }
    } catch {
      // best effort
    }

    // upsert per user+question, overwrite answer for today
    const existing = await ctx.db
      .query("userIcebreakerAnswers")
      .withIndex("by_user_question", (q: any) =>
        q.eq("userId", me._id as Id<"users">).eq("questionId", questionId)
      )
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(
        (existing as any)._id as Id<"userIcebreakerAnswers">,
        {
          answer: val,
          createdAt: now,
        } as any
      );
      return { success: true, updated: true } as const;
    }
    await ctx.db.insert("userIcebreakerAnswers", {
      userId: me._id as Id<"users">,
      questionId,
      answer: val,
      createdAt: now,
    } as any);
    return { success: true, created: true } as const;
  },
});

// Admin endpoints for managing icebreaker questions
export const listQuestions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    const qs = await ctx.db
      .query("icebreakerQuestions")
      .withIndex("by_active", (q: any) => q.eq("active", true))
      .collect();
    // Return all, including inactive, by merging an all-collect for simplicity
    const all = await ctx.db.query("icebreakerQuestions").collect();
    return all.map((q: any) => ({
      id: String(q._id),
      text: q.text as string,
      active: !!q.active,
      category: q.category ?? null,
      weight: typeof q.weight === "number" ? q.weight : null,
      createdAt: Number(q.createdAt || q._creationTime || Date.now()),
    }));
  },
});

export const createQuestion = mutation({
  args: {
    text: v.string(),
    category: v.optional(v.string()),
    active: v.optional(v.boolean()),
    weight: v.optional(v.number()),
  },
  handler: async (ctx, { text, category, active = true, weight }) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    const id = await ctx.db.insert("icebreakerQuestions", {
      text,
      category,
      active,
      weight,
      createdAt: Date.now(),
    } as any);
    return { id: String(id) } as const;
  },
});

export const updateQuestion = mutation({
  args: {
    id: v.string(),
    text: v.optional(v.string()),
    category: v.optional(v.string()),
    active: v.optional(v.boolean()),
    weight: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    const _id = id as unknown as Id<"icebreakerQuestions">;
    await ctx.db.patch(_id, { ...patch } as any);
    return { success: true } as const;
  },
});

export const deleteQuestion = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    const _id = id as unknown as Id<"icebreakerQuestions">;
    await ctx.db.delete(_id);
    return { success: true } as const;
  },
});


