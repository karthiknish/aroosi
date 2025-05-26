import { mutation } from "./_generated/server";
import { v } from "convex/values";

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
