import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Track a feature usage
export const trackUsage = mutation({
  args: {
    feature: v.union(
      v.literal("message_sent"),
      v.literal("profile_view"),
      v.literal("search_performed"),
      v.literal("interest_sent"),
      v.literal("profile_boost_used"),
      v.literal("voice_message_sent"),
    ),
    metadata: v.optional(
      v.object({
        targetUserId: v.optional(v.id("users")),
        searchQuery: v.optional(v.string()),
        messageType: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) throw new Error("User not found");

    // Record the usage
    await ctx.db.insert("usageTracking", {
      userId: user._id,
      feature: args.feature,
      timestamp: Date.now(),
      metadata: args.metadata,
    });

    // Update monthly summary
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const existingSummary = await ctx.db
      .query("usageSummaries")
      .withIndex("by_userId_month_feature", (q) =>
        q.eq("userId", user._id).eq("month", month).eq("feature", args.feature),
      )
      .first();

    if (existingSummary) {
      await ctx.db.patch(existingSummary._id, {
        count: existingSummary.count + 1,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("usageSummaries", {
        userId: user._id,
        month,
        feature: args.feature,
        count: 1,
        lastUpdated: Date.now(),
      });
    }

    return { success: true };
  },
});

// Get usage statistics for the current user
export const getUsageStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) throw new Error("User not found");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profile not found");

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Get current month's usage
    const monthlyUsage = await ctx.db
      .query("usageSummaries")
      .withIndex("by_userId_month", (q) =>
        q.eq("userId", user._id).eq("month", currentMonth),
      )
      .collect();

    // Convert to a map for easier access
    const usageMap = monthlyUsage.reduce(
      (acc, item) => {
        acc[item.feature] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Define limits based on subscription plan
    const plan = profile.subscriptionPlan || "free";
    const limits = {
      free: {
        message_sent: 50,
        profile_view: 10,
        search_performed: 20,
        interest_sent: 5,
        profile_boost_used: 0,
        voice_message_sent: 0,
      },
      premium: {
        message_sent: -1, // unlimited
        profile_view: 50,
        search_performed: -1,
        interest_sent: -1,
        profile_boost_used: 0,
        voice_message_sent: 10,
      },
      premiumPlus: {
        message_sent: -1,
        profile_view: -1,
        search_performed: -1,
        interest_sent: -1,
        profile_boost_used: 5,
        voice_message_sent: -1,
      },
    };

    const userLimits = limits[plan as keyof typeof limits];

    // Build usage response
    const features = [
      "message_sent",
      "profile_view",
      "search_performed",
      "interest_sent",
      "profile_boost_used",
      "voice_message_sent",
    ] as const;

    const usage = features.map((feature) => ({
      feature,
      used: usageMap[feature] || 0,
      limit: userLimits[feature],
      unlimited: userLimits[feature] === -1,
      remaining:
        userLimits[feature] === -1
          ? -1
          : Math.max(0, userLimits[feature] - (usageMap[feature] || 0)),
      percentageUsed:
        userLimits[feature] === -1
          ? 0
          : Math.min(
              100,
              ((usageMap[feature] || 0) / userLimits[feature]) * 100,
            ),
    }));

    return {
      plan,
      currentMonth,
      usage,
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
    };
  },
});

// Check if user can use a feature
export const canUseFeature = query({
  args: {
    feature: v.union(
      v.literal("message_sent"),
      v.literal("profile_view"),
      v.literal("search_performed"),
      v.literal("interest_sent"),
      v.literal("profile_boost_used"),
      v.literal("voice_message_sent"),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { canUse: false, reason: "Not authenticated" };

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) return { canUse: false, reason: "User not found" };

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) return { canUse: false, reason: "Profile not found" };

    // Get usage stats directly instead of using runQuery
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthlyUsage = await ctx.db
      .query("usageSummaries")
      .withIndex("by_userId_month", (q) =>
        q.eq("userId", user._id).eq("month", currentMonth),
      )
      .collect();

    const usageMap = monthlyUsage.reduce(
      (acc, item) => {
        acc[item.feature] = item.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const plan = profile.subscriptionPlan || "free";
    const limits = {
      free: {
        message_sent: 50,
        profile_view: 10,
        search_performed: 20,
        interest_sent: 5,
        profile_boost_used: 0,
        voice_message_sent: 0,
      },
      premium: {
        message_sent: -1,
        profile_view: 50,
        search_performed: -1,
        interest_sent: -1,
        profile_boost_used: 0,
        voice_message_sent: 10,
      },
      premiumPlus: {
        message_sent: -1,
        profile_view: -1,
        search_performed: -1,
        interest_sent: -1,
        profile_boost_used: 5,
        voice_message_sent: -1,
      },
    };

    const userLimits = limits[plan as keyof typeof limits];
    const currentUsage = usageMap[args.feature] || 0;
    const limit = userLimits[args.feature];
    const unlimited = limit === -1;

    if (unlimited) {
      return { canUse: true, unlimited: true };
    }

    const remaining = Math.max(0, limit - currentUsage);
    if (remaining > 0) {
      return { canUse: true, remaining };
    }

    return {
      canUse: false,
      reason: "Monthly limit reached",
      limit,
      used: currentUsage,
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime(),
    };
  },
});

// Get detailed usage history
export const getUsageHistory = query({
  args: {
    feature: v.optional(
      v.union(
        v.literal("message_sent"),
        v.literal("profile_view"),
        v.literal("search_performed"),
        v.literal("interest_sent"),
        v.literal("profile_boost_used"),
        v.literal("voice_message_sent"),
      ),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();
    if (!user) throw new Error("User not found");

    let query = ctx.db
      .query("usageTracking")
      .withIndex("by_userId_timestamp", (q) => q.eq("userId", user._id))
      .order("desc");

    if (args.feature) {
      // Filter by feature if specified
      const results = await query.collect();
      return results
        .filter((item) => item.feature === args.feature)
        .slice(0, args.limit || 100);
    }

    return await query.take(args.limit || 100);
  },
});
