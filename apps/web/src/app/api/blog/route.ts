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
  const pageRaw = parseInt(searchParams.get("page") || "0", 10);
  const page = isNaN(pageRaw) || pageRaw < 0 ? 0 : Math.min(pageRaw, 1000);
  const pageSizeRaw = parseInt(searchParams.get("pageSize") || "6", 10);
  const pageSize =
    isNaN(pageSizeRaw) || pageSizeRaw <= 0 ? 6 : Math.min(pageSizeRaw, 24);
  const category = searchParams.get("category") || undefined;
  const qRaw = searchParams.get("q");
  const q =
    qRaw && qRaw.trim().length > 1 ? qRaw.trim().toLowerCase() : undefined;

  try {
    // Robust querying: Firestore may require composite indexes for array-contains + orderBy.
    // To avoid 500s when index is missing, use a safe fallback path for category queries.
    const offset = page * pageSize;
    let posts: any[] = [];
    let total = 0;

    if (category && category !== "all") {
      // Fallback strategy: fetch category set without orderBy, sort & paginate in memory
      const catSnap = await db
        .collection(COLLECTION)
        .where("categories", "array-contains", category)
        .get();
      const all = catSnap.docs.map((d: any) => ({ _id: d.id, ...d.data() }));
      total = all.length;
      all.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      posts = all.slice(offset, offset + pageSize);
    } else {
      // No category filter: use efficient ordered query with pagination
      let query: any = db.collection(COLLECTION).orderBy("createdAt", "desc");
      try {
        const agg = await query.count().get();
        total = agg.data().count || 0;
      } catch {
        const allSnap = await query.get();
        total = allSnap.size;
      }
      if (offset > 0) query = query.offset(offset);
      query = query.limit(pageSize);
      const snap = await query.get();
      posts = snap.docs.map((d: any) => ({ _id: d.id, ...d.data() }));
    }

    if (q) {
      posts = posts.filter((p: any) => {
        const title = (p.title || "").toLowerCase();
        const excerpt = (p.excerpt || "").toLowerCase();
        return title.includes(q) || excerpt.includes(q);
      });
    }

    const res = successResponse({ posts, total, page, pageSize });
    res.headers.set(
      "Cache-Control",
      "public, max-age=60, stale-while-revalidate=120"
    );
    return res;
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
  // Enforce Pexels-only image URLs if provided
  if (
    body.imageUrl &&
    typeof body.imageUrl === "string" &&
    !/^https?:\/\/(images\.)?pexels\.com\//.test(body.imageUrl)
  ) {
    return errorResponse(
      "Featured image must be a Pexels URL (https://images.pexels.com/...)",
      400
    );
  }
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
