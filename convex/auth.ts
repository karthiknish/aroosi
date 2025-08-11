import { convexAuth } from "@convex-dev/auth/server";
import { action } from "./_generated/server";

// Convex Auth setup with Clerk
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [],
});

// Action to get current user identity - used by auth utilities
export const requireIdentity = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return identity;
  },
});