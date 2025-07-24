import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// Helper function to get user by email using full collection scan
async function getUserByEmailInternal(ctx: any, email: string) {
  const users = await ctx.db.query("users").collect();
  return users.find((user: any) => user.email === email);
}

// Track a feature usage
export const trackUsage = mutation({
  args: {
    feature: v.union(
      v.literal("message_sent"),
      v.literal("profile_view"),
      v.literal("search_performed"),
      v.literal("interest_sent"),
      v.literal("profile_boost_used"),
      v.literal("voice_message_sent")
    ),
    metadata: v.optional(
      v.object({
        targetUserId: v.optional(v.id("users")),
        searchQuery: v.optional(v.string()),
        messageType: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.getUserByEmail, {
      email: identity.email!,
    });
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
        q.eq("userId", user._id).eq("month", month).eq("feature", args.feature)
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
  handler: async (
    ctx
  ): Promise<{
    plan: string;
    usage: Array<{
      feature: string;
      used: number;
      limit: number;
      unlimited: boolean;
      remaining: number;
      percentageUsed: number;
      isDailyLimit: boolean;
    }>;
    monthlyUsage: Record<string, number>;
    dailyUsage: Record<string, number>;
    limits: Record<string, number>;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await getUserByEmailInternal(ctx, identity.email!);
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
        q.eq("userId", user._id).eq("month", currentMonth)
      )
      .collect();

    // Get daily usage for the last 24 hours for daily-limited features
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const allUsage = await ctx.db
      .query("usageTracking")
      .withIndex("by_userId_feature_timestamp", (q) => q.eq("userId", user._id))
      .collect();

    const recentDailyUsage = allUsage.filter(
      (item) => item.timestamp > twentyFourHoursAgo
    );

    // Calculate daily usage for profile views and searches
    const dailyUsageMap: Record<string, number> = {};
    recentDailyUsage.forEach((item) => {
      if (
        item.feature === "profile_view" ||
        item.feature === "search_performed"
      ) {
        dailyUsageMap[item.feature] = (dailyUsageMap[item.feature] || 0) + 1;
      }
    });

    // Convert to maps for easier access
    const monthlyUsageMap = monthlyUsage.reduce(
      (acc, item) => {
        acc[item.feature] = item.count;
        return acc;
      },
      {} as Record<string, number>
    );

    // Define limits based on subscription plan - aligned with mobile
    const plan = profile.subscriptionPlan || "free";
    const limits = {
      free: {
        message_sent: 5,
        profile_view: 10, // daily
        search_performed: 20, // daily
        interest_sent: 3, // monthly
        profile_boost_used: 0, // monthly
        voice_message_sent: 0, // monthly
      },
      premium: {
        message_sent: -1, // unlimited
        profile_view: 50, // daily
        search_performed: -1, // unlimited daily
        interest_sent: -1, // unlimited monthly
        profile_boost_used: 1, // monthly
        voice_message_sent: 10, // monthly
      },
      premiumPlus: {
        message_sent: -1, // unlimited
        profile_view: -1, // unlimited daily
        search_performed: -1, // unlimited daily
        interest_sent: -1, // unlimited monthly
        profile_boost_used: -1, // unlimited monthly
        voice_message_sent: -1, // unlimited monthly
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

    const usage = features.map((feature) => {
      const isDaily =
        feature === "profile_view" || feature === "search_performed";
      const monthlyUsed = monthlyUsageMap[feature] || 0;
      const dailyUsed = dailyUsageMap[feature] || 0;

      const used = isDaily ? dailyUsed : monthlyUsed;
      const limit = userLimits[feature as keyof typeof userLimits];

      return {
        feature,
        used,
        limit,
        unlimited: limit === -1,
        remaining: limit === -1 ? -1 : Math.max(0, limit - used),
        percentageUsed:
          limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100)),
        isDailyLimit: isDaily,
      };
    });

    return {
      plan,
      usage,
      monthlyUsage: monthlyUsageMap,
      dailyUsage: dailyUsageMap,
      limits: userLimits,
    };
  },
});

// Check if user can perform a specific action
export const checkActionLimit = query({
  args: {
    action: v.union(
      v.literal("message_sent"),
      v.literal("profile_view"),
      v.literal("search_performed"),
      v.literal("interest_sent"),
      v.literal("profile_boost_used"),
      v.literal("voice_message_sent")
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    canPerform: boolean;
    currentUsage: number;
    limit: number;
    remaining: number;
    plan: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await getUserByEmailInternal(ctx, identity.email!);
    if (!user) throw new Error("User not found");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (!profile) throw new Error("Profile not found");

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const plan = profile.subscriptionPlan || "free";

    // Define limits aligned with mobile
    const limits = {
      free: {
        message_sent: 5,
        profile_view: 10, // daily
        search_performed: 20, // daily
        interest_sent: 3, // monthly
        profile_boost_used: 0, // monthly
        voice_message_sent: 0, // monthly
      },
      premium: {
        message_sent: -1, // unlimited
        profile_view: 50, // daily
        search_performed: -1, // unlimited daily
        interest_sent: -1, // unlimited monthly
        profile_boost_used: 1, // monthly
        voice_message_sent: 10, // monthly
      },
      premiumPlus: {
        message_sent: -1, // unlimited
        profile_view: -1, // unlimited daily
        search_performed: -1, // unlimited daily
        interest_sent: -1, // unlimited monthly
        profile_boost_used: -1, // unlimited monthly
        voice_message_sent: -1, // unlimited monthly
      },
    };

    const userLimits = limits[plan as keyof typeof limits];
    const limit = userLimits[args.action as keyof typeof userLimits];

    // Check current usage
    let currentUsage = 0;

    if (args.action === "profile_view" || args.action === "search_performed") {
      // For daily limits, check usage in last 24 hours
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const allUsage = await ctx.db
        .query("usageTracking")
        .withIndex("by_userId_feature_timestamp", (q) =>
          q.eq("userId", user._id)
        )
        .collect();
      const recentUsage = allUsage.filter(
        (item) =>
          item.feature === args.action && item.timestamp > twentyFourHoursAgo
      );
      currentUsage = recentUsage.length;
    } else {
      // Monthly limits
      const monthlySummary = await ctx.db
        .query("usageSummaries")
        .withIndex("by_userId_month_feature", (q) =>
          q
            .eq("userId", user._id)
            .eq("month", currentMonth)
            .eq("feature", args.action)
        )
        .first();
      currentUsage = monthlySummary?.count || 0;
    }

    const canPerform = limit === -1 || currentUsage < limit;
    const remaining = limit === -1 ? -1 : Math.max(0, limit - currentUsage);

    return {
      canPerform,
      currentUsage,
      limit,
      remaining,
      plan,
    };
  },
});

// Get usage history for a specific feature
export const getUsageHistory = query({
  args: {
    feature: v.optional(v.string()),
    limit: v.optional(v.number()),
    days: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    Array<{
      _id: any;
      _creationTime: number;
      userId: any;
      feature: string;
      timestamp: number;
      metadata?: any;
    }>
  > => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.getUserByEmail, {
      email: identity.email!,
    });
    if (!user) throw new Error("User not found");

    let allUsage = await ctx.db
      .query("usageTracking")
      .withIndex("by_userId_feature_timestamp", (q) => q.eq("userId", user._id))
      .collect();

    if (args.days) {
      const cutoff = Date.now() - args.days * 24 * 60 * 60 * 1000;
      allUsage = allUsage.filter((item) => item.timestamp > cutoff);
    }

    if (args.feature) {
      allUsage = allUsage.filter((item) => item.feature === args.feature);
    }

    // Sort by timestamp descending and limit results
    allUsage.sort((a, b) => b.timestamp - a.timestamp);

    return allUsage.slice(0, args.limit || 100);
  },
});
