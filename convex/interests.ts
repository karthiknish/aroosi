import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { checkRateLimit } from "./utils/rateLimit";
import { requireAdmin } from "./utils/requireAdmin";
import { Id } from "./_generated/dataModel";

// Send an interest (like/express interest)
export const sendInterest = mutation({
  args: {
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
  },
  handler: async (
    ctx: MutationCtx,
    args: { fromUserId: Id<"users">; toUserId: Id<"users"> }
  ) => {
    // Rate limit by fromUserId
    const rateKey = `interest:send:${String(args.fromUserId)}`;
    const rate = await checkRateLimit(ctx.db, rateKey);
    if (!rate.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rate.retryAfter || 0) / 1000)} seconds.`,
      };
    }
    // Prevent duplicate or self-interest
    if (args.fromUserId === args.toUserId)
      throw new Error("Cannot send interest to self");
    const existing = await ctx.db
      .query("interests")
      .withIndex("by_from_to", (q: any) =>
        q.eq("fromUserId", args.fromUserId).eq("toUserId", args.toUserId)
      )
      .first();
    if (existing) throw new Error("Interest already sent");
    const now = Date.now();
    return ctx.db.insert("interests", {
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      status: "pending",
      createdAt: now,
    });
  },
});

// Accept or reject an interest
export const respondToInterest = mutation({
  args: {
    interestId: v.id("interests"),
    status: v.union(v.literal("accepted"), v.literal("rejected")),
  },
  handler: async (
    ctx: MutationCtx,
    args: { interestId: Id<"interests">; status: "accepted" | "rejected" }
  ) => {
    // Rate limit by interestId
    const rateKey = `interest:respond:${args.interestId}`;
    const rate = await checkRateLimit(ctx.db, rateKey);
    if (!rate.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rate.retryAfter || 0) / 1000)} seconds.`,
      };
    }
    const interest = await ctx.db.get(args.interestId);
    if (!interest) throw new Error("Interest not found");
    return ctx.db.patch(args.interestId, { status: args.status });
  },
});

// Query interests sent by a user
export const getSentInterests = query({
  args: { userId: v.id("users") },
  handler: async (ctx: QueryCtx, args: { userId: Id<"users"> }) => {
    return ctx.db
      .query("interests")
      .withIndex("by_from_to", (q: any) => q.eq("fromUserId", args.userId))
      .collect();
  },
});

// Query interests received by a user
export const getReceivedInterests = query({
  args: { userId: v.id("users") },
  handler: async (ctx: QueryCtx, args: { userId: Id<"users"> }) => {
    return ctx.db
      .query("interests")
      .withIndex("by_to", (q: any) => q.eq("toUserId", args.userId))
      .collect();
  },
});

// Check if two users have mutual accepted interest
export const isMutualInterest = query({
  args: {
    userA: v.id("users"),
    userB: v.id("users"),
  },
  handler: async (
    ctx: QueryCtx,
    args: { userA: Id<"users">; userB: Id<"users"> }
  ) => {
    const aToB = await ctx.db
      .query("interests")
      .withIndex("by_from_to", (q: any) =>
        q.eq("fromUserId", args.userA).eq("toUserId", args.userB)
      )
      .first();
    const bToA = await ctx.db
      .query("interests")
      .withIndex("by_from_to", (q: any) =>
        q.eq("fromUserId", args.userB).eq("toUserId", args.userA)
      )
      .first();
    return aToB?.status === "accepted" && bToA?.status === "accepted";
  },
});

export const removeInterest = mutation({
  args: {
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const interest = await ctx.db
      .query("interests")
      .withIndex("by_from_to", (q) =>
        q.eq("fromUserId", args.fromUserId).eq("toUserId", args.toUserId)
      )
      .first();
    if (!interest) {
      // Instead of throwing, return success (idempotent)
      return { success: true, alreadyRemoved: true };
    }
    await ctx.db.delete(interest._id);
    return { success: true };
  },
});

export const listAllInterests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
    return await ctx.db.query("interests").collect();
  },
});
