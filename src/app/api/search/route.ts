import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit"; // (retained for potential future re-enable)
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
      preferredGender, // now used to filter target profile gender (viewer preference)
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

    // NOTE: Previously enforced per-minute subscription feature rate limiting here.
    // We now rely on: (1) burst limiter above, (2) daily usageEvents quota via can-use endpoint when invoked elsewhere.
    // This removal prevents stacking 429 sources and lets search remain responsive while still guarded against abuse.

    // Build base Firestore query
    let base: FirebaseFirestore.Query = db
      .collection(COLLECTIONS.USERS)
      .where("isOnboardingComplete", "==", true);

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
    // Apply preferred gender filter: when viewer specifies a preference other than 'any'
    if (preferredGender && preferredGender !== "any") {
      base = base.where("gender", "==", preferredGender);
    }

    // Determine if we have inequality filters (Firestore requires first orderBy on that field)
    const hasAgeInequality =
      typeof ageMin === "number" || typeof ageMax === "number";

    // For stable cursor pagination: when age inequalities present, order by age asc then createdAt desc then docId desc
    // Otherwise (no inequalities), order by createdAt desc then docId desc
    let query: FirebaseFirestore.Query;
    if (hasAgeInequality) {
      query = base
        .orderBy("age", "asc")
        .orderBy("createdAt", "desc")
        .orderBy(FieldPath.documentId(), "desc");
    } else {
      query = base
        .orderBy("createdAt", "desc")
        .orderBy(FieldPath.documentId(), "desc");
    }

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
      // Decode cursor formats:
      //   createdAt|docId (legacy, when no age inequality ordering)
      //   age|createdAt|docId (new, when age inequality ordering used)
      let ageCursor: number | null = null;
      let createdAtCursor: number | null = null;
      let docIdCursor: string | null = null;
      try {
        const decoded = decodeURIComponent(cursor);
        const parts = decoded.split("|");
        if (parts.length === 3) {
          ageCursor = Number(parts[0]);
          createdAtCursor = Number(parts[1]);
          docIdCursor = parts[2];
        } else if (parts.length === 2) {
          createdAtCursor = Number(parts[0]);
          // legacy 2-part cursor
          docIdCursor = parts[1];
        }
      } catch {
        // malformed cursor ignored (treat as first page)
      }
      if (hasAgeInequality) {
        if (
          ageCursor !== null &&
          !Number.isNaN(ageCursor) &&
          createdAtCursor !== null &&
          !Number.isNaN(createdAtCursor) &&
          docIdCursor
        ) {
          query = query.startAfter(ageCursor, createdAtCursor, docIdCursor);
        }
      } else {
        if (
          createdAtCursor !== null &&
          !Number.isNaN(createdAtCursor) &&
          docIdCursor
        ) {
          query = query.startAfter(createdAtCursor, docIdCursor);
        }
      }
      query = query.limit(pageSize);
    } else {
      if (page > 0) {
        // Fallback legacy offset (note: costly at scale; prefer cursor path)
        query = query.offset(page * pageSize);
      }
      query = query.limit(pageSize);
    }

    function isIndexMissing(e: any): boolean {
      if (!e) return false;
      const msg = typeof e.message === "string" ? e.message : "";
      return (
        e.code === 9 ||
        msg.includes("FAILED_PRECONDITION") ||
        msg.includes("The query requires an index")
      );
    }

    async function runPrimaryQuery(): Promise<any[]> {
      const snap = await query.get();
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    }

    async function runFallbackScan(): Promise<{
      docs: any[];
      scanned: number;
    }> {
      const FALLBACK_SCAN_LIMIT = 400; // slightly higher for better result coverage
      const fallbackQuery = db
        .collection(COLLECTIONS.USERS)
        .where("isOnboardingComplete", "==", true)
        .orderBy("createdAt", "desc")
        .orderBy(FieldPath.documentId(), "desc")
        .limit(FALLBACK_SCAN_LIMIT);
      const fbSnap = await fallbackQuery.get();
      const all = fbSnap.docs.map(
        (d: FirebaseFirestore.QueryDocumentSnapshot) => ({
          id: d.id,
          ...(d.data() as any),
        })
      );
      let filtered = all.filter((d: any) => {
        if (city && city !== "any" && d.city !== city) return false;
        if (country && country !== "any" && d.country !== country) return false;
        if (ethnicity && ethnicity !== "any" && d.ethnicity !== ethnicity)
          return false;
        if (
          motherTongue &&
          motherTongue !== "any" &&
          d.motherTongue !== motherTongue
        )
          return false;
        if (language && language !== "any" && d.language !== language)
          return false;
        if (
          typeof ageMin === "number" &&
          (typeof d.age !== "number" || d.age < ageMin)
        )
          return false;
        if (
          typeof ageMax === "number" &&
          (typeof d.age !== "number" || d.age > ageMax)
        )
          return false;
        if (
          preferredGender &&
          preferredGender !== "any" &&
          d.gender !== preferredGender
        )
          return false;
        return true;
      });
      if (!cursor && page > 0) filtered = filtered.slice(page * pageSize);
      filtered = filtered.slice(0, pageSize);
      return { docs: filtered, scanned: all.length };
    }

    let docs: any[] = [];
    try {
      docs = await runPrimaryQuery();
    } catch (err: any) {
      if (isIndexMissing(err)) {
        console.warn("search.api index missing, applying fallback", {
          correlationId: cid,
          error: String(err?.message || err),
        });
        const fb = await runFallbackScan();
        docs = fb.docs;
        if (!total) total = fb.scanned; // approximate
      } else {
        console.error("search.api unexpected failure", {
          correlationId: cid,
          error: err,
        });
        throw err; // bubble to outer catch -> 500
      }
    }

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
          isOnboardingComplete: d.isOnboardingComplete,
          profileCompletionPercentage: d.profileCompletionPercentage,
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
      if (hasAgeInequality) {
        if (last?.age != null && last?.createdAt) {
          nextCursor = `${encodeURIComponent(
            `${last.age}|${last.createdAt}|${last.id}`
          )}`;
        }
      } else if (last?.createdAt) {
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
