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

// Admin: list push devices with optional search and pagination
export const adminListPushDevices = query({
  args: {
    search: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, { search, page, pageSize }) => {
    // Require any authenticated identity; route will enforce admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const all = await ctx.db.query("pushNotifications").collect();
    const term = (search ?? "").trim().toLowerCase();

    // Enrich with user email for search and display
    const enriched = await Promise.all(
      all.map(async (d: any) => {
        let email: string | undefined = undefined;
        try {
          const user = await ctx.db.get(d.userId);
          email = (user as any)?.email;
        } catch {}
        return { ...d, email } as any;
      })
    );

    let rows = enriched;
    if (term) {
      rows = rows.filter((d: any) => {
        return (
          String(d.playerId ?? "").toLowerCase().includes(term) ||
          String(d.email ?? "").toLowerCase().includes(term) ||
          String(d.deviceType ?? "").toLowerCase().includes(term)
        );
      });
    }

    // Sort by registeredAt desc then email asc
    rows.sort((a: any, b: any) => {
      const at = a.registeredAt ?? 0;
      const bt = b.registeredAt ?? 0;
      if (at !== bt) return bt - at;
      const ae = (a.email ?? "").localeCompare?.(b.email ?? "") ?? 0;
      return ae;
    });

    const size = Math.min(Math.max(pageSize ?? 20, 1), 100);
    const p = Math.max(page ?? 1, 1);
    const start = (p - 1) * size;
    const items = rows.slice(start, start + size).map((d: any) => ({
      userId: d.userId,
      email: d.email,
      playerId: d.playerId,
      deviceType: d.deviceType,
      deviceToken: d.deviceToken,
      registeredAt: d.registeredAt,
      isActive: d.isActive,
    }));

    return { items, total: rows.length, page: p, pageSize: size } as const;
  },
});