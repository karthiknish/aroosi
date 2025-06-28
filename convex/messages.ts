import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Profile } from "./users";
import { Id } from "convex/_generated/dataModel";

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
    type: v.optional(
      v.union(v.literal("text"), v.literal("voice"), v.literal("image")),
    ),
    audioStorageId: v.optional(v.string()),
    duration: v.optional(v.number()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if fromUserId and toUserId are mutual matches
    // (You may want to optimize this by storing matches in a table, but for now, use getMyMatches)
    const matches = await ctx.runQuery(api.users.getMyMatches, {});
    const isMatched = matches.some(
      (p: Profile | null) => p?.userId === args.toUserId,
    );
    if (!isMatched)
      throw new Error("You can only message users you are matched with.");
    const newId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      text: args.text,
      type: args.type || "text",
      audioStorageId: args.audioStorageId,
      duration: args.duration,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      createdAt: Date.now(),
    });
    const saved = await ctx.db.get(newId);
    return saved;
  },
});

// Fetch messages for a conversation
export const getMessages = query({
  args: {
    conversationId: v.string(),
    limit: v.optional(v.number()), // optional count, newest first
    before: v.optional(v.number()), // timestamp to fetch older than
  },
  handler: async (ctx, { conversationId, limit, before }) => {
    const query = ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .order("desc");

    const baseQuery = before
      ? query.filter((q) => q.lt(q.field("createdAt"), before))
      : query;

    const msgs = limit
      ? await baseQuery.take(limit)
      : await baseQuery.collect();
    // Return chronological order (oldest first)
    return msgs.reverse();
  },
});

// Add markConversationRead
export const markConversationRead = mutation({
  args: {
    conversationId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { conversationId, userId }) => {
    const unread = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();
    await Promise.all(
      unread.map(async (msg) => {
        if (msg.toUserId === userId && msg.readAt === undefined) {
          await ctx.db.patch(msg._id as Id<"messages">, { readAt: Date.now() });
        }
      }),
    );
    return { success: true };
  },
});

// Get unread counts for user
export const getUnreadCountsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_to", (q) => q.eq("toUserId", userId))
      .collect();
    const counts: Record<string, number> = {};
    msgs.forEach((m) => {
      if (m.readAt === undefined) {
        const otherId = m.fromUserId as string;
        counts[otherId] = (counts[otherId] || 0) + 1;
      }
    });
    return counts; // { otherUserId: count }
  },
});

// Get a specific voice message by ID
export const getVoiceMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db.get(messageId);
    if (!message) {
      throw new Error("Voice message not found");
    }

    // Only return voice messages
    if (message.type !== "voice" || !message.audioStorageId) {
      throw new Error("Message is not a voice message");
    }

    return message;
  },
});

// Generate upload URL for voice message
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get download URL for voice message
export const getVoiceMessageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});
