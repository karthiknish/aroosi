import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const slug = url.pathname.split("/").pop()!;
  const { getToken } = await auth();
  let token: string | null = null;
  if (getToken) {
    token = await getToken({ template: "convex" });
  }
  if (token) {
    convex.setAuth(token);
  }

  const post = await convex.query(api.blog.getBlogPostBySlug, { slug });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(post);
}
