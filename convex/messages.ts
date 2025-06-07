import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Profile } from "./users";

export const saveChatbotMessage = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("user"), v.literal("bot")),
    text: v.string(),
    timestamp: v.float64(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatbotMessages", {
      email: args.email,
      role: args.role,
      text: args.text,
      timestamp: args.timestamp,
    });
    return { success: true };
  },
});

// Send a chat message (only if users are matched)
export const sendMessage = mutation({
  args: {
    conversationId: v.string(),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if fromUserId and toUserId are mutual matches
    // (You may want to optimize this by storing matches in a table, but for now, use getMyMatches)
    const matches = await ctx.runQuery(api.users.getMyMatches, {});
    const isMatched = matches.some(
      (p: Profile) => p.userId === args.toUserId && p.profileFor !== undefined
    );
    if (!isMatched)
      throw new Error("You can only message users you are matched with.");
    await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      text: args.text,
      createdAt: Date.now(),
    });
    return { success: true };
  },
});

// Fetch messages for a conversation
export const getMessages = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});
