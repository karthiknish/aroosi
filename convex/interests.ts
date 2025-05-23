import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Send an interest (like/express interest)
export const sendInterest = mutation({
  args: {
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
  },
  handler: async (ctx: any, args: { fromUserId: string; toUserId: string }) => {
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
    ctx: any,
    args: { interestId: string; status: "accepted" | "rejected" }
  ) => {
    const interest = await ctx.db.get(args.interestId);
    if (!interest) throw new Error("Interest not found");
    return ctx.db.patch(args.interestId, { status: args.status });
  },
});

// Query interests sent by a user
export const getSentInterests = query({
  args: { userId: v.id("users") },
  handler: async (ctx: any, args: { userId: string }) => {
    return ctx.db
      .query("interests")
      .withIndex("by_from_to", (q: any) => q.eq("fromUserId", args.userId))
      .collect();
  },
});

// Query interests received by a user
export const getReceivedInterests = query({
  args: { userId: v.id("users") },
  handler: async (ctx: any, args: { userId: string }) => {
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
  handler: async (ctx: any, args: { userA: string; userB: string }) => {
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
