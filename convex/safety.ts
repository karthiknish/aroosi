import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Get block status between two users
export const getBlockStatus = query({
  args: {
    blockerUserId: v.id("users"),
    blockedUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const block = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerUserId", args.blockerUserId))
      .filter((q) => q.eq(q.field("blockedUserId"), args.blockedUserId))
      .first();
    
    return block;
  },
});

// Get all blocked users for a user
export const getBlockedUsers = query({
  args: {
    blockerUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const blocks = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerUserId", args.blockerUserId))
      .collect();
    
    return blocks;
  },
});

// Check if either user has blocked the other (for interaction validation)
export const canUsersInteract = query({
  args: {
    userA: v.id("users"),
    userB: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.userA === args.userB) return true; // Can always interact with self
    
    // Check if userA blocked userB
    const blockAtoB = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerUserId", args.userA))
      .filter((q) => q.eq(q.field("blockedUserId"), args.userB))
      .first();
    
    if (blockAtoB) return false;
    
    // Check if userB blocked userA
    const blockBtoA = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerUserId", args.userB))
      .filter((q) => q.eq(q.field("blockedUserId"), args.userA))
      .first();
    
    return !blockBtoA;
  },
});

// Report a user (for now, we'll just log it - you may want to add a reports table)
export const reportUser = mutation({
  args: {
    reporterUserId: v.id("users"),
    reportedUserId: v.id("users"),
    reason: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.reporterUserId === args.reportedUserId) {
      throw new Error("Cannot report yourself");
    }
    
    // TODO: In production, you'd want to:
    // 1. Create a reports table in your schema
    // 2. Store the report for admin review
    // 3. Send notifications to admins
    // 4. Potentially auto-ban after X reports
    
    console.log(`User ${args.reporterUserId} reported user ${args.reportedUserId} for: ${args.reason}`);
    if (args.description) {
      console.log(`Additional details: ${args.description}`);
    }
    
    return { success: true, message: "Report submitted successfully" };
  },
});

// Block a user
export const blockUser = mutation({
  args: { blockerUserId: v.id("users"), blockedUserId: v.id("users") },
  handler: async (ctx, { blockerUserId, blockedUserId }) => {
    if (blockerUserId === blockedUserId) throw new Error("Cannot block yourself");
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerUserId", blockerUserId))
      .filter((q) => q.eq(q.field("blockedUserId"), blockedUserId))
      .first();
    if (existing) return { success: true, already: true } as const;
    await ctx.db.insert("blocks", {
      blockerUserId,
      blockedUserId,
      createdAt: Date.now(),
    } as any);
    return { success: true } as const;
  },
});

// Unblock a user
export const unblockUser = mutation({
  args: { blockerUserId: v.id("users"), blockedUserId: v.id("users") },
  handler: async (ctx, { blockerUserId, blockedUserId }) => {
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerUserId", blockerUserId))
      .filter((q) => q.eq(q.field("blockedUserId"), blockedUserId))
      .first();
    if (!existing) return { success: true, already: true } as const;
    await ctx.db.delete((existing as any)._id as Id<"blocks">);
    return { success: true } as const;
  },
});