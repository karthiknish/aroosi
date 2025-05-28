import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export async function GET(req: NextRequest) {
  // Public endpoint: do not require authentication
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  // Do not set auth for public queries
  const url = new URL(req.url);
  const slug = url.pathname.split("/").pop()!;
  const result = await convex.query(api.blog.getBlogPostBySlug, { slug });
  return NextResponse.json(result);
}
