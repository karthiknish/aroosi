import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

export const createUser = mutation({
  args: {
    email: v.string(),
    hashedPassword: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      throw new Error("User already exists");
    }

    // Create user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      hashedPassword: args.hashedPassword,
      role: args.role || "user",
      banned: false,
    });

    // Create basic profile
    await ctx.db.insert("profiles", {
      userId,
      email: args.email,
      fullName: `${args.firstName} ${args.lastName}`,
      isProfileComplete: false,
      isOnboardingComplete: false,
      createdAt: Date.now(),
      profileFor: "self",
      subscriptionPlan: "free",
    } as any);

    return userId;
  },
});

export const authenticateUser = query({
  args: {
    email: v.string(),
    hashedPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user || user.hashedPassword !== args.hashedPassword) {
      return null;
    }

    if (user.banned) {
      throw new Error("Account is banned");
    }

    return {
      _id: user._id,
      email: user.email,
      role: user.role,
    };
  },
});

export const createGoogleUser = mutation({
  args: {
    email: v.string(),
    googleId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      throw new Error("User already exists");
    }

    // Create user with Google account
    const userId = await ctx.db.insert("users", {
      email: args.email,
      googleId: args.googleId,
      hashedPassword: "", // No password for Google users
      role: "user",
      banned: false,
      emailVerified: true,
      createdAt: Date.now(),
    });

    // Create basic profile
    await ctx.db.insert("profiles", {
      userId,
      email: args.email,
      fullName: args.name || `${args.firstName} ${args.lastName}`,
      isProfileComplete: false,
      isOnboardingComplete: false,
      createdAt: Date.now(),
      profileFor: "self",
      subscriptionPlan: "free",
    } as any);

    return userId;
  },
});

export const linkGoogleAccount = mutation({
  args: {
    userId: v.id("users"),
    googleId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      googleId: args.googleId,
    });
    return true;
  },
});

export const updatePassword = mutation({
  args: {
    userId: v.id("users"),
    hashedPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      hashedPassword: args.hashedPassword,
    });
    return true;
  },
});
