import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type FeatureAccessArgs = {
  userId: Id<"users">;
  feature: string;
};

export const checkFeatureAccess = query({
  args: {
    userId: v.id("users"),
    feature: v.string(),
  },
  handler: async (ctx: QueryCtx, args: FeatureAccessArgs): Promise<boolean> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user profile to check subscription
    const user = await ctx.runQuery(api.users.getUserByEmail, {
      email: identity.email!,
    });

    if (!user) {
      throw new Error("User not found");
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Check if subscription is still active
    const now = Date.now();
    const isSubscriptionActive =
      profile.subscriptionExpiresAt && profile.subscriptionExpiresAt > now;
    const currentPlan = isSubscriptionActive
      ? profile.subscriptionPlan || "free"
      : "free";

    // Define feature access rules
    const featureAccess: Record<string, string[]> = {
      voice_messages: ["premium", "premiumPlus"],
      unlimited_messaging: ["premium", "premiumPlus"],
      profile_boost: ["premium", "premiumPlus"],
      advanced_search: ["premium", "premiumPlus"],
      profile_views: ["premiumPlus"],
      priority_support: ["premiumPlus"],
    };

    const requiredPlans = featureAccess[args.feature];
    if (!requiredPlans) {
      // Feature not defined, allow access
      return true;
    }

    return requiredPlans.includes(currentPlan);
  },
});
