import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { db } from "@/lib/firebaseAdmin";
import { ensureAdmin } from "@/lib/auth/requireAdmin";
import {
  sanitizeBlogContent,
  sanitizeBlogExcerpt,
  sanitizeBlogSlug,
  sanitizeBlogTitle,
} from "../../../lib/blogSanitize";

const COLLECTION = "blogPosts";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "6", 10);
  const category = searchParams.get("category") || undefined;

  try {
    let query: any = db.collection(COLLECTION);
    if (category && category !== "all") {
      query = query.where("categories", "array-contains", category);
    }
    query = query.orderBy("createdAt", "desc");
    // Total count (aggregation). If unsupported, fallback to fetching IDs.
    let total = 0;
    try {
      const agg = await query.count().get();
      total = agg.data().count || 0;
    } catch {
      const allSnap = await query.get();
      total = allSnap.size;
    }
    // Pagination via offset (acceptable for small blog size)
    const offset = page * pageSize;
    if (offset > 0) query = query.offset(offset);
    query = query.limit(pageSize);
    const snap = await query.get();
    const posts = snap.docs.map((d: any) => ({ _id: d.id, ...d.data() }));
    return successResponse({ posts, total, page, pageSize });
  } catch (e) {
    return errorResponse(
      (e as Error).message || "Failed to fetch blog posts",
      500
    );
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  if (!body || typeof body !== "object")
    return errorResponse("Missing or invalid body", 400);
  try {
    await ensureAdmin();
  } catch (e) {
    const err = e as any;
    return errorResponse(
      err.message || "Unauthorized",
      err.status === 401 ? 401 : 403
    );
  }
  const required = ["title", "slug", "excerpt", "content", "categories"];
  for (const f of required)
    if (!(f in body)) return errorResponse(`Missing field: ${f}`, 400);
  const now = Date.now();
  const slug = sanitizeBlogSlug(String(body.slug));
  // Check duplicate slug
  const existing = await db
    .collection(COLLECTION)
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (!existing.empty) return errorResponse("Slug already exists", 409);
  const doc = db.collection(COLLECTION).doc();
  const post = {
    title: sanitizeBlogTitle(String(body.title)),
    slug,
    excerpt: sanitizeBlogExcerpt(String(body.excerpt)),
    content: sanitizeBlogContent(String(body.content)),
    imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
    categories: Array.isArray(body.categories)
      ? body.categories.slice(0, 10)
      : [],
    createdAt: now,
    updatedAt: now,
  };
  await doc.set(post);
  return successResponse({ _id: doc.id, ...post });
}

export async function DELETE(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  if (!body || typeof body !== "object" || !body._id)
    return errorResponse("Missing or invalid _id", 400);
  try {
    await ensureAdmin();
  } catch (e) {
    const err = e as any;
    return errorResponse(
      err.message || "Unauthorized",
      err.status === 401 ? 401 : 403
    );
  }
  try {
    await db.collection(COLLECTION).doc(String(body._id)).delete();
    return successResponse({ deleted: true });
  } catch (e) {
    return errorResponse(
      (e as Error).message || "Failed to delete blog post",
      500
    );
  }
}
