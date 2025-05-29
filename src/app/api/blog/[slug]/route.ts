import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

// Simple in-memory rate limit store (replace with Redis for production)
const rateLimitMap = new Map<string, { count: number; last: number }>();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 20;

export async function GET(req: NextRequest) {
  // Public endpoint: do not require authentication
  // Rate limiting by IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, last: now };
  if (now - entry.last > RATE_LIMIT_WINDOW) {
    entry.count = 0;
    entry.last = now;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  // Do not set auth for public queries
  const url = new URL(req.url);
  const slug = url.pathname.split("/").pop()!;
  const result = await convex.query(api.blog.getBlogPostBySlug, { slug });
  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  let body: unknown;
  try {
    body = await req.json();
    console.log("[PUT /api/blog/[slug]] Request body:", body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Missing or invalid body" },
      { status: 400 }
    );
  }
  // Use _id from the request body
  const _id = (body as Record<string, unknown>)._id;
  console.log("[PUT /api/blog/[slug]] _id:", _id);
  if (!_id || typeof _id !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid _id" },
      { status: 400 }
    );
  }
  // Validate required fields
  const requiredFields = [
    "title",
    "slug",
    "excerpt",
    "content",
    "imageUrl",
    "categories",
  ];
  for (const field of requiredFields) {
    if (!(field in body)) {
      return NextResponse.json(
        { error: `Missing field: ${field}` },
        { status: 400 }
      );
    }
  }
  try {
    const updateData: {
      _id: Id<"blogPosts">;
      title: string;
      slug: string;
      excerpt: string;
      content: string;
      imageUrl: string;
      categories: string[];
    } = {
      _id: _id as Id<"blogPosts">,
      title: String((body as Record<string, unknown>).title),
      slug: String((body as Record<string, unknown>).slug),
      excerpt: String((body as Record<string, unknown>).excerpt),
      content: String((body as Record<string, unknown>).content),
      imageUrl: String((body as Record<string, unknown>).imageUrl),
      categories: Array.isArray((body as Record<string, unknown>).categories)
        ? ((body as Record<string, unknown>).categories as string[])
        : [],
    };
    const result = await convex.mutation(api.blog.updateBlogPost, updateData);
    console.log("[PUT /api/blog/[slug]] Convex mutation result:", result);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("[PUT /api/blog/[slug]] Error:", err);
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to update blog post" },
      { status: 500 }
    );
  }
}