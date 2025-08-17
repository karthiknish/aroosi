// @ts-nocheck
import { query } from "./_generated/server";
import { authTables } from "@convex-dev/auth/server";

// Test function to check if auth tables exist
export const checkAuthTables = query({
  args: {},
  handler: async (ctx) => {
    try {
      // Try to query the auth tables
      const accounts = await ctx.db.query("authAccounts").collect();
      const sessions = await ctx.db.query("authSessions").collect();

      return {
        accounts: accounts.length,
        sessions: sessions.length,
        status: "success",
      };
    } catch (error) {
      return {
        error: (error as Error).message,
        status: "error",
      };
    }
  },
});
