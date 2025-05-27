import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
  const { getToken } = await auth();
  let token: string | null = null;
  if (getToken) {
    token = await getToken({ template: "convex" });
  }
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
  convex.setAuth(token);
  const body = await req.json();
  // Expect: { title, slug, excerpt, content, imageUrl, categories }
  const result = await convex.mutation(api.blog.createBlogPost, body);
  return NextResponse.json(result);
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
  convex.setAuth(token);
  const body = await req.json();
  // Expect: { _id }
  if (!body._id)
    return NextResponse.json({ error: "Missing _id" }, { status: 400 });
  const result = await convex.mutation(api.blog.deleteBlogPost, {
    _id: body._id,
  });
  return NextResponse.json(result);
}
