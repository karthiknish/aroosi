import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { z } from "zod";
import { requireSession } from "@/app/api/_utils/auth";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { FieldPath } from "firebase-admin/firestore";

// type Gender = "any" | "male" | "female" | "other";

// Sanitized bounded string: trims, strips risky chars, 2..50
const SanStr = z
  .string()
  .trim()
  .transform((v) => v.replace(/[<>'"&]/g, ""))
  .pipe(z.string().min(2).max(50));

const QuerySchema = z.object({
  city: SanStr.optional(),
  country: SanStr.optional(),
  ethnicity: SanStr.optional(),
  motherTongue: SanStr.optional(),
  language: SanStr.optional(),
  preferredGender: z.enum(["any", "male", "female", "other"]).optional(),
  ageMin: z.coerce.number().int().min(18).max(120).optional(),
  ageMax: z.coerce.number().int().min(18).max(120).optional(),
  page: z.coerce.number().int().min(0).max(100).default(0),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  cursor: z.string().min(1).max(200).optional(), // base64 or 'createdAt|id'
});

export async function GET(request: NextRequest) {
  try {
    const cid =
      request.headers.get("x-correlation-id") ||
      (typeof crypto !== "undefined" && (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

    // Firebase cookie-based session
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const userId = String(session.userId);
    const viewerPlan = session.profile?.subscriptionPlan || "free";

    // Burst limiter
    const burstLimit = checkApiRateLimit(`search:${userId}`, 60, 60_000);
    if (!burstLimit.allowed) {
      return errorResponse("Rate limit exceeded. Please slow down.", 429);
    }

    // Parse & validate
    const { searchParams } = new URL(request.url);
    const paramsObj = Object.fromEntries(searchParams.entries());
    const parsed = QuerySchema.safeParse(paramsObj);
    if (!parsed.success) {
      if (process.env.NODE_ENV === "development") {
        console.warn("search.api validation failed", {
          correlationId: cid,
          issues: parsed.error.issues,
        });
      }
      return errorResponse("Invalid parameters", 400);
    }
    const {
      city,
      country,
      ethnicity,
      motherTongue,
      language,
      preferredGender, // presently unused in Firestore filter logic
      ageMin,
      ageMax,
      page,
      pageSize,
      cursor,
    } = parsed.data;

    if (
      typeof ageMin === "number" &&
      typeof ageMax === "number" &&
      ageMin > ageMax
    ) {
      return errorResponse(
        "Minimum age cannot be greater than maximum age",
        400
      );
    }

    // Advanced filter gating
    const hasPremiumParams = [ethnicity, motherTongue, language].some(
      (v) => v && v !== "any"
    );
    const hasAdvancedFilters =
      viewerPlan === "premium" ||
      viewerPlan === "premium_plus" ||
      viewerPlan === "premiumPlus";
    if (hasPremiumParams && !hasAdvancedFilters) {
      return errorResponse(
        "Advanced filters require a Premium subscription",
        403
      );
    }

    // Subscription-aware rate limit (plan quotas)
    const subscriptionLimit =
      await subscriptionRateLimiter.checkSubscriptionRateLimit(
        request,
        "", // bearer token not used in Firebase cookie model
        userId,
        "search_performed"
      );
    if (!subscriptionLimit.allowed) {
      return errorResponse(
        subscriptionLimit.error || "Subscription limit exceeded",
        429
      );
    }

    // Build base Firestore query
    let base: FirebaseFirestore.Query = db
      .collection(COLLECTIONS.USERS)
      .where("isProfileComplete", "==", true);

    if (city && city !== "any") base = base.where("city", "==", city);
    if (country && country !== "any")
      base = base.where("country", "==", country);
    if (ethnicity && ethnicity !== "any")
      base = base.where("ethnicity", "==", ethnicity);
    if (motherTongue && motherTongue !== "any")
      base = base.where("motherTongue", "==", motherTongue);
    if (language && language !== "any")
      base = base.where("language", "==", language); // field stored as 'language' if present
    if (typeof ageMin === "number") base = base.where("age", ">=", ageMin);
    if (typeof ageMax === "number") base = base.where("age", "<=", ageMax);

    // For stable cursor pagination: order by createdAt desc then docId desc
    let query = base
      .orderBy("createdAt", "desc")
      .orderBy(FieldPath.documentId(), "desc");

    // Aggregate count BEFORE pagination (use base query to avoid startAfter)
    let total = 0;
    try {
      const countSnap = await (base as any).count().get();
      total = countSnap.data().count || 0;
    } catch {
      // ignore count failure
    }

    // Cursor pagination preferred when cursor provided; else fallback to offset for initial integration
    if (cursor) {
      // Decode cursor format: createdAt|docId (both encoded as strings)
      let createdAtCursor: number | null = null;
      let docIdCursor: string | null = null;
      try {
        const decoded = decodeURIComponent(cursor);
        const parts = decoded.split("|");
        if (parts.length === 2) {
          createdAtCursor = Number(parts[0]);
          docIdCursor = parts[1];
        }
      } catch {
        // malformed cursor ignored (treat as first page)
      }
      if (createdAtCursor && docIdCursor) {
        query = query.startAfter(createdAtCursor, docIdCursor);
      }
      query = query.limit(pageSize);
    } else {
      if (page > 0) {
        // Fallback legacy offset (note: costly at scale; prefer cursor path)
        query = query.offset(page * pageSize);
      }
      query = query.limit(pageSize);
    }

    const snap = await query.get();
    const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

      if (!total) total = docs.length + (cursor ? 0 : page * pageSize); // heuristic fallback

    const profiles = docs
      .filter((d) => !d.banned && !d.hiddenFromSearch)
      .map((d) => ({
        userId: d.id,
        email: d.email,
        profile: {
          fullName: d.fullName || "",
          city: d.city,
          dateOfBirth: d.dateOfBirth,
          isProfileComplete: d.isProfileComplete,
          hiddenFromSearch: d.hiddenFromSearch,
          boostedUntil: d.boostedUntil,
          subscriptionPlan: d.subscriptionPlan,
          hideFromFreeUsers: d.hideFromFreeUsers,
          profileImageUrls: d.profileImageUrls || [],
          hasSpotlightBadge: d.hasSpotlightBadge,
          spotlightBadgeExpiresAt: d.spotlightBadgeExpiresAt,
        },
      }));

    // Build next cursor if more potential results
    let nextCursor: string | undefined = undefined;
    if (docs.length === pageSize) {
      const last = docs[docs.length - 1];
      if (last?.createdAt) {
        nextCursor = `${encodeURIComponent(`${last.createdAt}|${last.id}`)}`;
      }
    }

    return successResponse({
      profiles,
      total,
      page,
      pageSize,
      nextCursor,
      correlationId: cid,
      searchParams: {
        city,
        country,
        ageMin,
        ageMax,
        preferredGender,
        ethnicity,
        motherTongue,
        language,
      },
    });
  } catch (error) {
    console.error("Firestore search API error", error);
    return errorResponse("Search service temporarily unavailable", 500);
  }
}
