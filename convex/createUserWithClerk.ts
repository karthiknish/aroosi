import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createUserWithClerk = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
      .first();
      
    if (existingUser) {
      return existingUser._id;
    }

    // Guard: do not create user/profile without a filled profile
    throw new Error(
      "Guarded: createUserWithClerk is disabled without a complete profile payload. Use users.createUserAndProfile via /api/profile."
    );
  },
});