import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils/requireAdmin";
import { checkRateLimit } from "./utils/rateLimit";

export const createBlogPost = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const rateKey = `blog:create:${identity?.subject || "anon"}`;
    const rate = await checkRateLimit(ctx.db, rateKey);
    if (!rate.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rate.retryAfter || 0) / 1000)} seconds.`,
      };
    }
    const now = Date.now();
    await ctx.db.insert("blogPosts", {
      ...args,
      categories: args.categories || [],
      createdAt: now,
      updatedAt: now,
    });
    return { success: true };
  },
});

export const listBlogPosts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    requireAdmin(identity);
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

export const updateBlogPost = mutation({
  args: {
    _id: v.id("blogPosts"),
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const rateKey = `blog:update:${identity?.subject || "anon"}`;
    const rate = await checkRateLimit(ctx.db, rateKey);
    if (!rate.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rate.retryAfter || 0) / 1000)} seconds.`,
      };
    }
    requireAdmin(identity);
    await ctx.db.patch(args._id, {
      title: args.title,
      slug: args.slug,
      excerpt: args.excerpt,
      content: args.content,
      imageUrl: args.imageUrl,
      categories: args.categories || [],
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const deleteBlogPost = mutation({
  args: { _id: v.id("blogPosts") },
  handler: async (ctx, { _id }) => {
    const identity = await ctx.auth.getUserIdentity();
    const rateKey = `blog:delete:${identity?.subject || "anon"}`;
    const rate = await checkRateLimit(ctx.db, rateKey);
    if (!rate.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((rate.retryAfter || 0) / 1000)} seconds.`,
      };
    }
    requireAdmin(identity);
    await ctx.db.delete(_id);
    return { success: true };
  },
});

export const listBlogPostsPaginated = query({
  args: {
    page: v.number(),
    pageSize: v.number(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { page, pageSize, category }) => {
    let all = await ctx.db.query("blogPosts").order("desc").collect();
    if (category) {
      all = all.filter(
        (post) => post.categories && post.categories.includes(category)
      );
    }
    const total = all.length;
    const start = page * pageSize;
    const end = start + pageSize;
    const posts = all.slice(start, end);
    return { posts, total, page, pageSize };
  },
});
