import { internalMutation, query } from "../_generated/server";
import { v } from "convex/values";

// Query to find all users and group by clerkId
export const findDuplicateClerkUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const byClerkId: Record<string, any[]> = {};
    for (const user of users) {
      if (!user.clerkId) continue;
      if (!byClerkId[user.clerkId]) byClerkId[user.clerkId] = [];
      byClerkId[user.clerkId].push(user);
    }
    // Only return clerkIds with more than one user
    return Object.entries(byClerkId)
      .filter(([_, arr]) => arr.length > 1)
      .map(([clerkId, arr]) => ({ clerkId, users: arr }));
  },
});

// Internal mutation to clean up duplicates for a given clerkId
export const cleanupDuplicateClerkUsers = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .collect();
    if (users.length <= 1) return { message: "No duplicates for this clerkId" };
    // Keep the earliest created user
    const [keep, ...toDelete] = users.sort(
      (a, b) => a._creationTime - b._creationTime
    );
    // Reassign profiles
    const profiles = await ctx.db.query("profiles").collect();
    for (const profile of profiles) {
      if (toDelete.some((u) => u._id === profile.userId)) {
        await ctx.db.patch(profile._id, { userId: keep._id, clerkId });
      }
    }
    // Delete duplicate users
    for (const user of toDelete) {
      await ctx.db.delete(user._id);
    }
    return {
      message: `Kept user ${keep._id}, deleted ${toDelete.length} duplicates for clerkId ${clerkId}`,
      kept: keep,
      deleted: toDelete.map((u) => u._id),
    };
  },
});
