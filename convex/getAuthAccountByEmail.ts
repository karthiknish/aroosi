// @ts-nocheck
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getAuthAccountByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("provider"), "password"))
      .filter((q) => q.eq(q.field("providerAccountId"), email))
      .first();
  },
});
