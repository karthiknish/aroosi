import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const submitContact = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("contactSubmissions", {
      ...args,
      createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const createBlogPost = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("blogPosts", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true };
  },
});

export const listBlogPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("blogPosts").order("desc").collect();
    return posts;
  },
});

export const getBlogPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

export const contactSubmissions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contactSubmissions").order("desc").collect();
  },
});

export const updateBlogPost = mutation({
  args: {
    _id: v.id("blogPosts"),
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args._id, {
      title: args.title,
      slug: args.slug,
      excerpt: args.excerpt,
      content: args.content,
      imageUrl: args.imageUrl,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const deleteBlogPost = mutation({
  args: { _id: v.id("blogPosts") },
  handler: async (ctx, { _id }) => {
    await ctx.db.delete(_id);
    return { success: true };
  },
});

export const banUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, { banned: true });
    // Optionally ban profile too
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.patch(profile._id, { banned: true });
    return { success: true };
  },
});

export const unbanUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, { banned: false });
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.patch(profile._id, { banned: false });
    return { success: true };
  },
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Delete profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.delete(profile._id);
    // Delete user
    await ctx.db.delete(userId);
    return { success: true };
  },
});

export const listUsersWithProfiles = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const profiles = await ctx.db.query("profiles").collect();
    return users.map((user) => ({
      ...user,
      profile:
        profiles.find((p) => p.userId === user._id && p.banned !== true) ||
        null,
    }));
  },
});

export const userCounts = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const profiles = await ctx.db.query("profiles").collect();
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    return {
      totalUsers: users.length,
      bannedUsers: users.filter((u) => u.banned).length,
      completedProfiles: profiles.filter((p) => p.isProfileComplete).length,
      newThisWeek: users.filter((u) => u._creationTime > weekAgo).length,
      newThisMonth: users.filter((u) => u._creationTime > monthAgo).length,
    };
  },
});
