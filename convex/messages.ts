import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { checkRateLimit } from "./utils/rateLimit";

// Send a message (only if mutual interest)
export const sendMessage = mutation({
  args: {
    conversationId: v.string(),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    text: v.string(),
  },
  handler: async (
    ctx: any,
    args: {
      conversationId: string;
      fromUserId: string;
      toUserId: string;
      text: string;
    }
  ) => {
    // Rate limit by fromUserId
    const rateKey = `message:send:${args.fromUserId}`;
    const rate = await checkRateLimit(ctx.db, rateKey);
    if (!rate.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rate.retryAfter || 0) / 1000)} seconds.`,
      };
    }
    if (!args.text.trim()) throw new Error("Message cannot be empty");
    // Optionally: check mutual interest here (or in frontend)
    const now = Date.now();
    return ctx.db.insert("messages", {
      conversationId: args.conversationId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      text: args.text,
      createdAt: now,
    });
  },
});

// Query messages for a conversation (sorted by createdAt)
export const getMessages = query({
  args: { conversationId: v.string() },
  handler: async (ctx: any, args: { conversationId: string }) => {
    return ctx.db
      .query("messages")
      .withIndex("by_conversation", (q: any) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();
  },
});

// List all conversations for a user (returns unique conversationIds)
export const getConversationsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx: any, args: { userId: string }) => {
    const sent = await ctx.db
      .query("messages")
      .withIndex("by_conversation")
      .collect();
    // Filter conversations where user is a participant
    const conversations = new Set<string>();
    for (const msg of sent) {
      if (msg.fromUserId === args.userId || msg.toUserId === args.userId) {
        conversations.add(msg.conversationId);
      }
    }
    return Array.from(conversations);
  },
});

export const saveChatbotMessage = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("user"), v.literal("bot")),
    text: v.string(),
    timestamp: v.float64(),
  },
  handler: async (ctx, args) => {
    // Rate limit by email
    const rateKey = `chatbot:save:${args.email}`;
    const rate = await checkRateLimit(ctx.db, rateKey);
    if (!rate.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rate.retryAfter || 0) / 1000)} seconds.`,
      };
    }
    return ctx.db.insert("chatbotMessages", args);
  },
});
