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

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      role: "user",
      emailVerified: false, // Will be updated when email is verified
      createdAt: Date.now(),
    });

    // Create profile for the user
    await ctx.db.insert("profiles", {
      userId,
      fullName: args.fullName || "",
      isProfileComplete: false,
      isOnboardingComplete: false,
      createdAt: Date.now(),
    });

    return userId;
  },
});