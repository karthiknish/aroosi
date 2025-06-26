import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const registerDevice = mutation({
  args: {
    userId: v.id("users"),
    playerId: v.string(),
    deviceType: v.string(),
    deviceToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if this playerId is already registered for this user
    const existingRegistration = await ctx.db
      .query("pushNotifications")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();

    if (existingRegistration) {
      // Update existing registration
      await ctx.db.patch(existingRegistration._id, {
        userId: args.userId,
        deviceType: args.deviceType,
        deviceToken: args.deviceToken,
        registeredAt: Date.now(),
        isActive: true,
      });
      return existingRegistration._id;
    } else {
      // Create new registration
      const registrationId = await ctx.db.insert("pushNotifications", {
        userId: args.userId,
        playerId: args.playerId,
        deviceType: args.deviceType,
        deviceToken: args.deviceToken,
        registeredAt: Date.now(),
        isActive: true,
      });
      return registrationId;
    }
  },
});

export const unregisterDevice = mutation({
  args: {
    userId: v.id("users"),
    playerId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find and deactivate the registration
    const registration = await ctx.db
      .query("pushNotifications")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (registration) {
      await ctx.db.patch(registration._id, {
        isActive: false,
      });
      return true;
    }
    return false;
  },
});

export const getUserDevices = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const devices = await ctx.db
      .query("pushNotifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return devices;
  },
});