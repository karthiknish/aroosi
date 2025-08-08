import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const recordDeliveryReceipt = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    status: v.union(v.literal("delivered"), v.literal("read"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if a receipt already exists for this message and user
    const existingReceipt = await ctx.db
      .query("deliveryReceipts")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingReceipt) {
      // Update existing receipt
      await ctx.db.patch(existingReceipt._id, {
        status: args.status,
        timestamp: Date.now(),
      });
      return existingReceipt._id;
    } else {
      // Create new receipt
      const receiptId = await ctx.db.insert("deliveryReceipts", {
        messageId: args.messageId,
        userId: args.userId,
        status: args.status,
        timestamp: Date.now(),
      });
      return receiptId;
    }
  },
});

export const getDeliveryReceipts = query({
  args: {
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get all messages in the conversation first
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Get delivery receipts for all messages in the conversation
    const receipts = [];
    for (const message of messages) {
      const messageReceipts = await ctx.db
        .query("deliveryReceipts")
        .withIndex("by_messageId", (q) => q.eq("messageId", message._id))
        .collect();
      receipts.push(...messageReceipts);
    }

    return receipts;
  },
});

export const getMessageDeliveryStatus = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const receipts = await ctx.db
      .query("deliveryReceipts")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .collect();

    return receipts;
  },
});