import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

export async function GET(req: NextRequest) {
  const { getToken } = await auth();
  let token: string | null = null;
  if (getToken) {
    token = await getToken({ template: "convex" });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  if (token) {
    convex.setAuth(token);
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "6", 10);
  const category = searchParams.get("category") || undefined;

  const result = await convex.query(api.blog.listBlogPostsPaginated, {
    page,
    pageSize,
    category,
  });
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Missing or invalid body" },
      { status: 400 }
    );
  }
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
    const result = await convex.mutation(
      api.blog.createBlogPost,
      body as {
        imageUrl?: string;
        categories?: string[];
        title: string;
        slug: string;
        excerpt: string;
        content: string;
      }
    );
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to create blog post" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("_id" in body)) {
    return NextResponse.json(
      { error: "Missing or invalid _id" },
      { status: 400 }
    );
  }
  try {
    const result = await convex.mutation(api.blog.deleteBlogPost, {
      _id: (body as { _id: Id<"blogPosts"> })._id,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to delete blog post" },
      { status: 500 }
    );
  }
}
