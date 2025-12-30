import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/handler";
import { db } from "@/lib/firebaseAdmin";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { sanitizeBlogContent, sanitizeBlogExcerpt, sanitizeBlogTitle, sanitizeBlogSlug } from "@/lib/blogSanitize";
import { requireSession } from "@/app/api/_utils/auth";

const COLLECTION = "blogSubmissions";

export async function POST(req: NextRequest) {
  // Optional auth: associate submission if user present
  const session = await requireSession(req).catch(() => null);
  let body: any;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
  if (!body || typeof body !== "object")
    return errorResponse("Missing or invalid body", 400);
  const required = ["title", "slug", "excerpt", "content"];
  for (const f of required)
    if (!(f in body)) return errorResponse(`Missing field: ${f}`, 400);
  try {
    const now = nowTimestamp();
    const doc = db.collection(COLLECTION).doc();
    const submission = {
      title: sanitizeBlogTitle(String(body.title)),
      slug: sanitizeBlogSlug(String(body.slug)),
      excerpt: sanitizeBlogExcerpt(String(body.excerpt)),
      content: sanitizeBlogContent(String(body.content)),
      imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
      categories: Array.isArray(body.categories)
        ? body.categories.slice(0, 10)
        : [],
      createdAt: now,
      updatedAt: now,
      status: "pending" as const,
      authorUserId: session && !("errorResponse" in session) ? session.userId : null,
    };
    await doc.set(submission);
    return successResponse({ id: doc.id });
  } catch (e) {
    return errorResponse((e as Error).message || "Failed to submit blog", 500);
  }
}


