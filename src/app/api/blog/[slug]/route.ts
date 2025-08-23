import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { db } from "@/lib/firebaseAdmin";
import { ensureAdmin } from "@/lib/auth/requireAdmin";
import {
  sanitizeBlogContent,
  sanitizeBlogExcerpt,
  sanitizeBlogSlug,
  sanitizeBlogTitle,
} from "@/lib/blogSanitize";

// Simple in-memory rate limit store (replace with Redis for production)
const rateLimitMap = new Map<string, { count: number; last: number }>();
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 20;

export async function GET(req: NextRequest) {
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
  if (entry.count > RATE_LIMIT_MAX)
    return errorResponse("Too many requests. Please try again later.", 429);
  const url = new URL(req.url);
  const raw = url.pathname.split("/").pop()!;
  const key = decodeURIComponent(raw);
  try {
    // Strict: lookup by sanitized slug only
    const slug = sanitizeBlogSlug(key);
    const snap = await db
      .collection("blogPosts")
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snap.empty) return errorResponse("Not found", 404);
    const doc = snap.docs[0];
    const data = { _id: doc.id, ...doc.data() } as any;
    // Derive weak ETag from updatedAt/createdAt + id
    const ts = data.updatedAt || data.createdAt || 0;
    const etag = `W/"${data._id}:${ts}"`;
    const ifNone = req.headers.get("if-none-match");
    if (ifNone && ifNone === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }
    const res = successResponse(data);
    res.headers.set("ETag", etag);
    res.headers.set(
      "Cache-Control",
      "public, max-age=120, stale-while-revalidate=300"
    );
    return res;
  } catch (e) {
    return errorResponse(
      (e as Error).message || "Failed to fetch blog post",
      500
    );
  }
}

export async function PUT(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  if (!body || typeof body !== "object" || !body._id)
    return errorResponse("Missing or invalid _id", 400);
  const required = ["title", "slug", "excerpt", "content", "categories"];
  for (const f of required)
    if (!(f in body)) return errorResponse(`Missing field: ${f}`, 400);
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
    const ref = db.collection("blogPosts").doc(String(body._id));
    const exists = await ref.get();
    if (!exists.exists) return errorResponse("Not found", 404);
    const updated = {
      title: sanitizeBlogTitle(String(body.title)),
      slug: sanitizeBlogSlug(String(body.slug)),
      excerpt: sanitizeBlogExcerpt(String(body.excerpt)),
      content: sanitizeBlogContent(String(body.content)),
      imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
      categories: Array.isArray(body.categories)
        ? body.categories.slice(0, 10)
        : [],
      updatedAt: Date.now(),
    };
    await ref.set(updated, { merge: true });
    const doc = await ref.get();
    return successResponse({ _id: doc.id, ...doc.data() });
  } catch (e) {
    return errorResponse(
      (e as Error).message || "Failed to update blog post",
      500
    );
  }
}
