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
    
    // Update the interest status
    await ctx.db.patch(args.interestId, { status: args.status });
    
    // If accepted, check for mutual interest and create match
    if (args.status === "accepted") {
      const mutualInterest = await ctx.db
        .query("interests")
        .withIndex("by_from_to", (q: any) =>
          q.eq("fromUserId", interest.toUserId).eq("toUserId", interest.fromUserId)
        )
        .first();
      
      if (mutualInterest && mutualInterest.status === "accepted") {
        // Create a match record for easier querying
        const existingMatch = await ctx.db
          .query("matches")
          .withIndex("by_users", (q: any) =>
            q.eq("user1Id", interest.fromUserId).eq("user2Id", interest.toUserId)
          )
          .first();
        
        const existingMatchReverse = await ctx.db
          .query("matches")
          .withIndex("by_users", (q: any) =>
            q.eq("user1Id", interest.toUserId).eq("user2Id", interest.fromUserId)
          )
          .first();
        
        if (!existingMatch && !existingMatchReverse) {
          await ctx.db.insert("matches", {
            user1Id: interest.fromUserId,
            user2Id: interest.toUserId,
            status: "matched",
            createdAt: Date.now(),
            conversationId: `${interest.fromUserId}_${interest.toUserId}`,
          });
        }
      }
    }
    
    return { success: true, status: args.status };
  },
});

// Query interests sent by a user
export const getSentInterests = query({
  args: { userId: v.id("users") },
  handler: async (ctx: QueryCtx, args: { userId: Id<"users"> }) => {
    const interests = await ctx.db
      .query("interests")
      .withIndex("by_from_to", (q: any) => q.eq("fromUserId", args.userId))
      .collect();

    // Enrich with profile data
    const enrichedInterests = await Promise.all(
      interests.map(async (interest) => {
        const toProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", interest.toUserId))
          .first();
        
        return {
          ...interest,
          toProfile: toProfile ? {
            fullName: toProfile.fullName,
            city: toProfile.city,
            profileImageIds: toProfile.profileImageIds,
            profileImageUrls: toProfile.profileImageUrls,
          } : null,
        };
      })
    );

    return enrichedInterests;
  },
});

// Query interests received by a user
export const getReceivedInterests = query({
  args: { userId: v.id("users") },
  handler: async (ctx: QueryCtx, args: { userId: Id<"users"> }) => {
    const interests = await ctx.db
      .query("interests")
      .withIndex("by_to", (q: any) => q.eq("toUserId", args.userId))
      .collect();

    // Enrich with profile data
    const enrichedInterests = await Promise.all(
      interests.map(async (interest) => {
        const fromProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", interest.fromUserId))
          .first();
        
        return {
          ...interest,
          fromProfile: fromProfile ? {
            fullName: fromProfile.fullName,
            city: fromProfile.city,
            profileImageIds: fromProfile.profileImageIds,
            profileImageUrls: fromProfile.profileImageUrls,
          } : null,
        };
      })
    );

    return enrichedInterests;
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

// Query the status of an interest between two users
export const getInterestStatus = query({
  args: {
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
  },
  handler: async (
    ctx: QueryCtx,
    args: { fromUserId: Id<"users">; toUserId: Id<"users"> }
  ) => {
    const interest = await ctx.db
      .query("interests")
      .withIndex("by_from_to", (q: any) =>
        q.eq("fromUserId", args.fromUserId).eq("toUserId", args.toUserId)
      )
      .first();
    return interest ? interest.status : null;
  },
});
