import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  errorResponsePublic,
} from "@/lib/apiResponse";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit"; // (retained for potential future re-enable)
import { z } from "zod";
import { requireSession } from "@/app/api/_utils/auth";
import { db, COLLECTIONS } from "@/lib/firebaseAdmin";
import { FieldPath } from "firebase-admin/firestore";
// Logging removed per request

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
    if ("errorResponse" in session) {
      return session.errorResponse;
    }
    const userId = String(session.userId);
    const viewerProfile = session.profile;
    const viewerPlan = viewerProfile?.subscriptionPlan || "free";

    if (!viewerProfile?.isOnboardingComplete) {
      return errorResponsePublic(
        "Please finish onboarding to use search.",
        403,
        { code: "ONBOARDING_INCOMPLETE" }
      );
    }

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
      // Humanize first validation issue for user-friendly feedback
      const issue = parsed.error.issues[0];
      let friendly = "Invalid search filters";
      if (issue) {
        const path = issue.path.join(".");
        if (path === "ageMin" && issue.code === "too_small") {
          friendly = "Minimum age must be at least 18.";
        } else if (path === "ageMax" && issue.code === "too_small") {
          friendly = "Maximum age must be at least 18."; // theoretical; max has same min constraint
        } else if (path === "ageMin" && issue.code === "too_big") {
          friendly = "Minimum age is too large.";
        } else if (path === "ageMax" && issue.code === "too_big") {
          friendly = "Maximum age cannot exceed 120.";
        } else if (path === "pageSize" && issue.code === "too_big") {
          friendly = "Page size is too large.";
        } else if (path === "pageSize" && issue.code === "too_small") {
          friendly = "Page size must be at least 1.";
        } else if (path === "preferredGender") {
          friendly = "Invalid preferred gender value.";
        }
      }
      return errorResponsePublic(friendly, 400, { code: "VALIDATION_ERROR" });
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
      return errorResponsePublic(
        "Minimum age cannot be greater than maximum age",
        400,
        { code: "AGE_RANGE_INVALID" }
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
      return errorResponsePublic(
        "Advanced filters require a Premium subscription",
        403,
        { code: "UPGRADE_REQUIRED" }
      );
    }

    // NOTE: Previously enforced per-minute subscription feature rate limiting here.
    // We now rely on: (1) burst limiter above, (2) daily usageEvents quota via can-use endpoint when invoked elsewhere.
    // This removal prevents stacking 429 sources and lets search remain responsive while still guarded against abuse.

    // Build base Firestore query
    const isAny = (v?: string) =>
      typeof v === "string" ? v.trim().toLowerCase() === "any" : false;
    let base: FirebaseFirestore.Query = db
      .collection(COLLECTIONS.USERS)
      .where("isOnboardingComplete", "==", true);

    // City now handled as case-insensitive substring filter AFTER fetch to allow partial matches.
    // (Previously exact equality in Firestore. This change broadens match capability.)
    const cityFilter = city && !isAny(city) ? city.toLowerCase() : undefined;
    if (country && !isAny(country)) base = base.where("country", "==", country);
    if (ethnicity && !isAny(ethnicity))
      base = base.where("ethnicity", "==", ethnicity);
    if (motherTongue && !isAny(motherTongue))
      base = base.where("motherTongue", "==", motherTongue);
    if (language && !isAny(language))
      base = base.where("language", "==", language); // field stored as 'language' if present
    // Age filtering now handled in-memory using derived age from dateOfBirth (supports profiles lacking precomputed age field).
    // We intentionally skip Firestore inequality filters on 'age' to avoid excluding documents missing 'age'.
    // Apply preferred gender filter: when viewer specifies a preference other than 'any'
    if (preferredGender && preferredGender !== "any") {
      base = base.where("gender", "==", preferredGender);
    }

    // Determine if we have inequality filters (Firestore requires first orderBy on that field)
    const hasAgeInequality = false; // we removed direct Firestore age inequality filters (see note above)

    // Composite ordering migration:
    // We now attempt to push the answeredIcebreakersCount weighting into Firestore ordering
    // to avoid in-memory resort. Index requirements (add to firestore.indexes.json):
    //   isOnboardingComplete ASC, age ASC, answeredIcebreakersCount DESC, createdAt DESC, __name__ DESC (when age inequality)
    //   isOnboardingComplete ASC, answeredIcebreakersCount DESC, createdAt DESC, __name__ DESC (no age inequality)
    // Additional equality filters (city, country, gender, etc.) will still require further composite indexes
    // for fully indexed execution. If they are absent OR matching index exists, Firestore returns ordered results.
    // Otherwise we fall back to previous behaviour (scan subset + in-memory sort) when index missing.
    let query: FirebaseFirestore.Query;
    const includeAnsweredOrdering = true; // feature flag – set false to revert quickly if needed
    if (hasAgeInequality) {
      if (includeAnsweredOrdering) {
        query = base
          .orderBy("age", "asc")
          .orderBy("answeredIcebreakersCount", "desc")
          .orderBy("createdAt", "desc")
          .orderBy(FieldPath.documentId(), "desc");
      } else {
        query = base
          .orderBy("age", "asc")
          .orderBy("createdAt", "desc")
          .orderBy(FieldPath.documentId(), "desc");
      }
    } else {
      if (includeAnsweredOrdering) {
        query = base
          .orderBy("answeredIcebreakersCount", "desc")
          .orderBy("createdAt", "desc")
          .orderBy(FieldPath.documentId(), "desc");
      } else {
        query = base
          .orderBy("createdAt", "desc")
          .orderBy(FieldPath.documentId(), "desc");
      }
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
      // Decode cursor formats (backwards compatible):
      //   createdAt|docId (legacy, no age inequality, pre-answered ordering)
      //   age|createdAt|docId (legacy with age inequality, pre-answered ordering)
      //   answered|createdAt|docId (new, no age inequality, with answered ordering)
      //   age|answered|createdAt|docId (new, with age inequality & answered ordering)
      let ageCursor: number | null = null;
      let answeredCursor: number | null = null;
      let createdAtCursor: number | null = null;
      let docIdCursor: string | null = null;
      try {
        const decoded = decodeURIComponent(cursor);
        const parts = decoded.split("|");
        if (parts.length === 4) {
          // age|answered|createdAt|docId
          ageCursor = Number(parts[0]);
          answeredCursor = Number(parts[1]);
          createdAtCursor = Number(parts[2]);
          docIdCursor = parts[3];
        } else if (parts.length === 3) {
          if (hasAgeInequality) {
            // legacy age|createdAt|docId
            ageCursor = Number(parts[0]);
            createdAtCursor = Number(parts[1]);
            docIdCursor = parts[2];
          } else {
            // answered|createdAt|docId (new without age inequality)
            answeredCursor = Number(parts[0]);
            createdAtCursor = Number(parts[1]);
            docIdCursor = parts[2];
          }
        } else if (parts.length === 2) {
          // legacy createdAt|docId
          createdAtCursor = Number(parts[0]);
          docIdCursor = parts[1];
        }
      } catch {
        // malformed cursor ignored (treat as first page)
      }
      if (hasAgeInequality) {
        if (includeAnsweredOrdering) {
          if (
            ageCursor !== null &&
            !Number.isNaN(ageCursor) &&
            answeredCursor !== null &&
            !Number.isNaN(answeredCursor) &&
            createdAtCursor !== null &&
            !Number.isNaN(createdAtCursor) &&
            docIdCursor
          ) {
            query = query.startAfter(
              ageCursor,
              answeredCursor,
              createdAtCursor,
              docIdCursor
            );
          } else if (
            // fall back to legacy 3-part cursor if provided
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
            ageCursor !== null &&
            !Number.isNaN(ageCursor) &&
            createdAtCursor !== null &&
            !Number.isNaN(createdAtCursor) &&
            docIdCursor
          ) {
            query = query.startAfter(ageCursor, createdAtCursor, docIdCursor);
          }
        }
      } else {
        if (includeAnsweredOrdering) {
          if (
            answeredCursor !== null &&
            !Number.isNaN(answeredCursor) &&
            createdAtCursor !== null &&
            !Number.isNaN(createdAtCursor) &&
            docIdCursor
          ) {
            query = query.startAfter(
              answeredCursor,
              createdAtCursor,
              docIdCursor
            );
          } else if (
            createdAtCursor !== null &&
            !Number.isNaN(createdAtCursor) &&
            docIdCursor
          ) {
            // legacy 2-part
            query = query.startAfter(createdAtCursor, docIdCursor);
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
        const computeAge = (): number | null => {
          // Prioritize deriving from dateOfBirth (handles Firestore Timestamp / seconds form)
          const dob = d.dateOfBirth;
          let dt: Date | null = null;
          if (dob) {
            if (typeof dob === "number") dt = new Date(dob);
            else if (typeof dob === "string") {
              const parsed = Date.parse(dob);
              if (!Number.isNaN(parsed)) dt = new Date(parsed);
            } else if (typeof dob === "object") {
              try {
                if (dob && typeof (dob as any).toDate === "function") {
                  dt = (dob as any).toDate();
                } else if (
                  Object.prototype.hasOwnProperty.call(dob, "seconds") &&
                  typeof (dob as any).seconds === "number"
                ) {
                  dt = new Date((dob as any).seconds * 1000);
                }
              } catch {
                /* ignore */
              }
            }
          }
          if (!dt) {
            // Fallback: attempt numeric/string 'age'
            if (typeof d.age === "number" && !Number.isNaN(d.age)) return d.age;
            if (typeof d.age === "string") {
              const num = parseInt(d.age, 10);
              if (!Number.isNaN(num)) return num;
            }
            return null;
          }
          const now = Date.now();
          if (dt.getTime() > now) return null; // future DOB invalid
          const ageMs = now - dt.getTime();
          const derived = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));
          if (derived < 0 || derived > 150) return null; // sanity bounds
          return derived;
        };
        if (
          cityFilter &&
          (!d.city ||
            typeof d.city !== "string" ||
            !d.city.toLowerCase().includes(cityFilter))
        )
          return false;
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
        if (typeof ageMin === "number") {
          const a = computeAge();
          if (a === null || a < ageMin) return false;
        }
        if (typeof ageMax === "number") {
          const a = computeAge();
          if (a === null || a > ageMax) return false;
        }
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
    let primaryAnsweredOrderingApplied = false;
    try {
      docs = await runPrimaryQuery();
      primaryAnsweredOrderingApplied = includeAnsweredOrdering; // we attempted it and query succeeded
    } catch (err: any) {
      if (isIndexMissing(err)) {
        const fb = await runFallbackScan();
        docs = fb.docs;
        if (!total) total = fb.scanned; // approximate
        primaryAnsweredOrderingApplied = false;
      } else {
        throw err; // bubble to outer catch -> 500
      }
    }

    // Apply city substring filtering for primary query path (fallback already handled it)
    if (cityFilter) {
      docs = docs.filter(
        (d: any) =>
          d.city &&
          typeof d.city === "string" &&
          d.city.toLowerCase().includes(cityFilter)
      );
    }

    // Apply city substring filtering for primary query path (fallback already handled it)
    if (cityFilter) {
      docs = docs.filter(
        (d: any) =>
          d.city &&
          typeof d.city === "string" &&
          d.city.toLowerCase().includes(cityFilter)
      );
    }

    // Extra age filtering pass for primary query results when age constraints active
    if (typeof ageMin === "number" || typeof ageMax === "number") {
      const derive = (d: any): number | null => {
        const dob = d.dateOfBirth;
        let dt: Date | null = null;
        if (dob) {
          if (typeof dob === "number") dt = new Date(dob);
          else if (typeof dob === "string") {
            const parsed = Date.parse(dob);
            if (!Number.isNaN(parsed)) dt = new Date(parsed);
          } else if (typeof dob === "object") {
            try {
              if (dob && typeof (dob as any).toDate === "function") {
                dt = (dob as any).toDate();
              } else if (
                Object.prototype.hasOwnProperty.call(dob, "seconds") &&
                typeof (dob as any).seconds === "number"
              ) {
                dt = new Date((dob as any).seconds * 1000);
              }
            } catch {
              /* ignore */
            }
          }
        }
        if (!dt) {
          if (typeof d.age === "number" && !Number.isNaN(d.age)) return d.age;
          if (typeof d.age === "string") {
            const num = parseInt(d.age, 10);
            if (!Number.isNaN(num)) return num;
          }
          return null;
        }
        const now = Date.now();
        if (dt.getTime() > now) return null;
        const ageMs = now - dt.getTime();
        const derived = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));
        if (derived < 0 || derived > 150) return null;
        return derived;
      };
      docs = docs.filter((d: any) => {
        const ageVal = derive(d);
        if (ageVal === null) return false;
        if (typeof ageMin === "number" && ageVal < ageMin) return false;
        if (typeof ageMax === "number" && ageVal > ageMax) return false;
        return true;
      });
    }

    if (
      !total ||
      cityFilter ||
      typeof ageMin === "number" ||
      typeof ageMax === "number"
    ) {
      // Recalculate approximate total when using substring filter or if total unset
      total = docs.length + (cursor ? 0 : page * pageSize);
    }

    // Apply in-memory weighting ONLY if Firestore ordering by answeredIcebreakersCount was not applied
    if (!primaryAnsweredOrderingApplied) {
      try {
        docs.sort((a: any, b: any) => {
          const ac =
            typeof a.answeredIcebreakersCount === "number"
              ? a.answeredIcebreakersCount
              : 0;
          const bc =
            typeof b.answeredIcebreakersCount === "number"
              ? b.answeredIcebreakersCount
              : 0;
          if (bc !== ac) return bc - ac; // higher count first
          return 0; // keep original relative order (already by recency)
        });
      } catch (e) {}
    }

    const profiles = docs
      .filter((d) => !d.banned && !d.hiddenFromSearch)
      .map((d) => {
        return {
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
            answeredIcebreakersCount: d.answeredIcebreakersCount,
          },
        };
      });

    // Build next cursor if more potential results
    let nextCursor: string | undefined = undefined;
    if (docs.length === pageSize) {
      const last = docs[docs.length - 1];
      const lastAnswered =
        typeof last?.answeredIcebreakersCount === "number"
          ? last.answeredIcebreakersCount
          : 0;
      if (hasAgeInequality) {
        if (last?.age != null && last?.createdAt) {
          if (includeAnsweredOrdering) {
            nextCursor = `${encodeURIComponent(
              `${last.age}|${lastAnswered}|${last.createdAt}|${last.id}`
            )}`;
          } else {
            nextCursor = `${encodeURIComponent(
              `${last.age}|${last.createdAt}|${last.id}`
            )}`;
          }
        }
      } else if (last?.createdAt) {
        if (includeAnsweredOrdering) {
          nextCursor = `${encodeURIComponent(
            `${lastAnswered}|${last.createdAt}|${last.id}`
          )}`;
        } else {
          nextCursor = `${encodeURIComponent(`${last.createdAt}|${last.id}`)}`;
        }
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
