// @ts-nocheck
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createAuthAccount = mutation({
  args: {
    email: v.string(),
    hashedPassword: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { email, hashedPassword, userId }) => {
    // Create an auth account for the password provider
    const accountId = await ctx.db.insert("authAccounts", {
      provider: "password",
      providerAccountId: email,
      secret: hashedPassword,
      userId: userId,
    });

    return accountId;
  },
});
