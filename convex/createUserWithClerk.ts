import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createUserWithClerk = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists by clerkId
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), args.clerkId))
      .first();
      
    if (existingUser) {
      return existingUser._id;
    }
    
    // Check if user already exists by email
    const existingUserByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
      
    if (existingUserByEmail) {
      // Update the existing user with clerkId
      await ctx.db.patch(existingUserByEmail._id, { clerkId: args.clerkId });
      return existingUserByEmail._id;
    }

    // Guard: do not create user/profile without a complete profile payload
    throw new Error(
      "Guarded: createUserWithClerk is disabled without a complete profile payload. Use users.createUserAndProfile via /api/profile."
    );
  },
});