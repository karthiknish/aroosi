import { query } from "./_generated/server";
import { v } from "convex/values";

export const getCurrentUserWithProfile = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user by Clerk ID
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), args.userId))
      .first();
      
    if (!user) {
      return null;
    }

    // Get profile by user ID
    const profile = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    return {
      user,
      profile,
    };
  },
});