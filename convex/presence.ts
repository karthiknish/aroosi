import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const heartbeat = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const now = Date.now();

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen: now, isOnline: true });
      return existing._id;
    }
    const id = await ctx.db.insert("presence", {
      userId,
      lastSeen: now,
      isOnline: true,
    });
    return id;
  },
});

export const markOffline = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        isOnline: false,
        lastSeen: Date.now(),
      });
      return true;
    }
    return false;
  },
});

export const getPresence = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const row = await ctx.db
      .query("presence")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!row) return { isOnline: false, lastSeen: 0 };
    // Consider a user online if heartbeat within last 25s
    const isOnline = row.isOnline && Date.now() - row.lastSeen < 25000;
    return { isOnline, lastSeen: row.lastSeen };
  },
});


