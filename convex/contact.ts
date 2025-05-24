import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { checkRateLimit } from "./utils/rateLimit";

export const submitContact = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Rate limit by email (could also use IP if available)
    const rateKey = `contact:${args.email}`;
    const rate = await checkRateLimit(ctx.db, rateKey);
    if (!rate.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rate.retryAfter || 0) / 1000)} seconds.`,
      };
    }
    await ctx.db.insert("contactSubmissions", {
      ...args,
      createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const contactSubmissions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contactSubmissions").order("desc").collect();
  },
});
