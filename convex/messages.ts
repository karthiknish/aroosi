import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Profile } from "./users";
import { Id } from "./_generated/dataModel";

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
    text: v.optional(v.string()),
    type: v.optional(
      v.union(v.literal("text"), v.literal("voice"), v.literal("image"))
    ),
    audioStorageId: v.optional(v.string()),
    duration: v.optional(v.number()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    peaks: v.optional(v.array(v.number())), // normalized 0..1 waveform samples
  },
  handler: async (ctx, args) => {
    // Ensure users are matched before allowing message
    const matches = await ctx.runQuery(api.users.getMyMatches, {});
    const isMatched = matches.some((p: any) => p?.userId === args.toUserId);
    if (!isMatched) {
      throw new Error("You can only message users you are matched with.");
    }

    // Default to text when type not provided
    const type = args.type || "text";

    // Validation per message type
    if (type === "text") {
      if (!args.text || args.text.trim() === "") {
        throw new Error("Text message cannot be empty");
      }
    } else if (type === "voice") {
      if (!args.audioStorageId) {
        throw new Error("Voice message missing audioStorageId");
      }
      if (args.duration === undefined || args.duration <= 0) {
        throw new Error("Voice message missing duration");
      }
      // Optional peaks validation (lightweight)
      if (args.peaks) {
        if (!Array.isArray(args.peaks) || args.peaks.length === 0) {
          throw new Error("Invalid peaks array");
        }
        // Normalize and bound length consistently (cap to 256 samples)
        // Clamp to [0,1] and remove non-finite values
        args.peaks = args.peaks
          .map((n) => (typeof n === "number" && isFinite(n) ? n : 0))
          .map((n) => (n < 0 ? 0 : n > 1 ? 1 : n));
        const MAX_PEAKS = 256;
        if (args.peaks.length > MAX_PEAKS) {
          args.peaks = args.peaks.slice(0, MAX_PEAKS);
        }
      }
    } else if (type === "image") {
      if (!args.audioStorageId) {
        throw new Error("Image message missing storageId");
      }
    }

    const newId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      text: type === "text" ? args.text || "" : "",
      type,
      audioStorageId: args.audioStorageId,
      duration: args.duration,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      peaks: args.peaks, // persisted waveform peaks (optional)
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

// Fetch only voice messages for a conversation
export const getVoiceMessages = query({
  args: {
    conversationId: v.string(),
  },
  handler: async (ctx, { conversationId }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .filter((q) => q.eq(q.field("type"), "voice"))
      .collect();
  },
});
