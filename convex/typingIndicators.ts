import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const updateTypingStatus = mutation({
  args: {
    conversationId: v.string(),
    userId: v.id("users"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Soft cleanup of stale indicators for this conversation (older than 10s)
    const now = Date.now();
    const stale = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    await Promise.all(
      stale
        .filter((ind) => now - ind.lastUpdated > 10000)
        .map((ind) => ctx.db.patch(ind._id, { isTyping: false, lastUpdated: now })),
    );

    // Check if a typing indicator already exists for this user and conversation
    const existingIndicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingIndicator) {
      // Update existing indicator
      await ctx.db.patch(existingIndicator._id, {
        isTyping: args.isTyping,
        lastUpdated: Date.now(),
      });
      return existingIndicator._id;
    } else {
      // Create new indicator
      const indicatorId = await ctx.db.insert("typingIndicators", {
        conversationId: args.conversationId,
        userId: args.userId,
        isTyping: args.isTyping,
        lastUpdated: Date.now(),
      });
      return indicatorId;
    }
  },
});

export const getTypingUsers = query({
  args: {
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get all typing indicators for this conversation
    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("isTyping"), true))
      .collect();

    // Filter out stale indicators (older than 10 seconds)
    const now = Date.now();
    const activeIndicators = indicators.filter(
      (indicator) => now - indicator.lastUpdated < 10000
    );

    // Note: Stale indicators will be cleaned up by the next mutation call
    // We can't modify data in a query function

    return activeIndicators.map((indicator) => ({
      userId: indicator.userId,
      lastUpdated: indicator.lastUpdated,
    }));
  },
});

export const cleanupTypingIndicators = mutation({
  args: {
    conversationId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Set typing to false for this user in this conversation
    const indicator = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (indicator) {
      await ctx.db.patch(indicator._id, {
        isTyping: false,
        lastUpdated: Date.now(),
      });
      return true;
    }
    return false;
  },
});