import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { convexMutationWithAuth, convexQueryWithAuth } from "@/lib/convexServer";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  // Public endpoint: do not require authentication
  // Public: cookie not required
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "6", 10);
  const category = searchParams.get("category") || undefined;
  const result = await convexQueryWithAuth(req, api.blog.listBlogPostsPaginated, {
    page,
    pageSize,
    category,
  });
  return successResponse(result, 200);
}

export async function POST(req: NextRequest) {
  // Cookie-based auth via Convex session
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  if (!body || typeof body !== "object") {
    return errorResponse("Missing or invalid body", 400);
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
      return errorResponse(`Missing field: ${field}`, 400);
    }
  }
  try {
    const result = await convexMutationWithAuth(
      req,
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
    return successResponse(result);
  } catch (err: unknown) {
    return errorResponse(
      (err as Error)?.message || "Failed to create blog post",
      500
    );
  }
}

export async function DELETE(req: NextRequest) {
  // Cookie-based auth via Convex session
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  if (!body || typeof body !== "object" || !("_id" in body)) {
    return errorResponse("Missing or invalid _id", 400);
  }
  try {
    const result = await convexMutationWithAuth(req, api.blog.deleteBlogPost, {
      _id: (body as { _id: Id<"blogPosts"> })._id,
    });
    return successResponse(result);
  } catch (err: unknown) {
    return errorResponse(
      (err as Error)?.message || "Failed to delete blog post",
      500
    );
  }
}
