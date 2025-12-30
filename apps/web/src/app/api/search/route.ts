import { NextRequest } from "next/server";
import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext,
  validateQueryParams
} from "@/lib/api/handler";
import { searchSchema } from "@/lib/api/schemas";
import { db, COLLECTIONS, adminStorage } from "@/lib/firebaseAdmin";
import { FieldPath, Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { nowTimestamp } from "@/lib/utils/timestamp";
import {
  calculateAge as robustCalculateAge,
  deriveDateFromAny,
} from "@/lib/validation/dateValidation";

export const GET = createAuthenticatedHandler(async (ctx: ApiContext) => {
  try {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const viewerProfile = (ctx.user as any).profile || (ctx.user as any);
    const viewerPlan = viewerProfile?.subscriptionPlan || "free";

    // Ensure we have a valid user profile
    if (!viewerProfile) {
      return errorResponse("User profile not found. Please complete your profile.", 404, { correlationId: ctx.correlationId });
    }

    // Parse & validate query params
    const validationResult = validateQueryParams(ctx.request, searchSchema);
    if (!validationResult.success) {
      const issue = validationResult.errors[0];
      let friendly = "Invalid search filters";
      if (issue) {
        const path = issue.path.join(".");
        if (path === "ageMin" && issue.code === "too_small") {
          friendly = "Minimum age must be at least 18.";
        } else if (path === "ageMax" && issue.code === "too_small") {
          friendly = "Maximum age must be at least 18.";
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
      return errorResponse(friendly, 400, { correlationId: ctx.correlationId, code: "VALIDATION_ERROR" });
    }

    const {
      city,
      country,
      ethnicity,
      motherTongue,
      language,
      preferredGender,
      ageMin,
      ageMax,
      page,
      pageSize,
      cursor,
    } = validationResult.data;

    if (
      typeof ageMin === "number" &&
      typeof ageMax === "number" &&
      ageMin > ageMax
    ) {
      return errorResponse(
        "Minimum age cannot be greater than maximum age",
        400,
        { correlationId: ctx.correlationId, code: "AGE_RANGE_INVALID" }
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
        403,
        { correlationId: ctx.correlationId, code: "UPGRADE_REQUIRED" }
      );
    }

    // Build base Firestore query
    const isAny = (v?: string) =>
      typeof v === "string" ? v.trim().toLowerCase() === "any" : false;
    let base: Query = db.collection(COLLECTIONS.USERS);

    const cityFilter = city && !isAny(city) ? city.toLowerCase() : undefined;
    if (country && !isAny(country)) base = base.where("country", "==", country);
    if (ethnicity && !isAny(ethnicity))
      base = base.where("ethnicity", "==", ethnicity);
    if (motherTongue && !isAny(motherTongue))
      base = base.where("motherTongue", "==", motherTongue);
    if (language && !isAny(language))
      base = base.where("language", "==", language);
    
    if (preferredGender && preferredGender !== "any") {
      base = base.where("gender", "==", preferredGender);
    }

    let query: Query;
    const includeAnsweredOrdering = true;
    const includeBoostOrdering = true;
    
    if (includeAnsweredOrdering) {
      if (includeBoostOrdering) {
        query = base
          .orderBy("boostedUntil", "desc")
          .orderBy("answeredIcebreakersCount", "desc")
          .orderBy("createdAt", "desc")
          .orderBy(FieldPath.documentId(), "desc");
      } else {
        query = base
          .orderBy("answeredIcebreakersCount", "desc")
          .orderBy("createdAt", "desc")
          .orderBy(FieldPath.documentId(), "desc");
      }
    } else {
      if (includeBoostOrdering) {
        query = base
          .orderBy("boostedUntil", "desc")
          .orderBy("createdAt", "desc")
          .orderBy(FieldPath.documentId(), "desc");
      } else {
        query = base
          .orderBy("createdAt", "desc")
          .orderBy(FieldPath.documentId(), "desc");
      }
    }

    // Aggregate count BEFORE pagination
    let total = 0;
    try {
      const countSnap = await (base as any).count().get();
      total = countSnap.data().count || 0;
    } catch {
      // ignore count failure
    }

    if (cursor) {
      let ageCursor: number | null = null;
      let answeredCursor: number | null = null;
      let createdAtCursor: number | null = null;
      let docIdCursor: string | null = null;
      try {
        const decoded = decodeURIComponent(cursor);
        const parts = decoded.split("|");
        if (parts.length === 4) {
          answeredCursor = Number(parts[1]);
          createdAtCursor = Number(parts[2]);
          docIdCursor = parts[3];
        } else if (parts.length === 3) {
          answeredCursor = Number(parts[0]);
          createdAtCursor = Number(parts[1]);
          docIdCursor = parts[2];
        } else if (parts.length === 2) {
          createdAtCursor = Number(parts[0]);
          docIdCursor = parts[1];
        }
      } catch {
        // malformed cursor ignored
      }
      
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
      query = query.limit(pageSize ?? 20);
    } else {
      const currentPage = page ?? 0;
      const size = pageSize ?? 20;
      if (currentPage > 0) {
        query = query.offset(currentPage * size);
      }
      query = query.limit(size);
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
      const FALLBACK_SCAN_LIMIT = 400;
      const fallbackQuery = db
        .collection(COLLECTIONS.USERS)
        .orderBy("createdAt", "desc")
        .orderBy(FieldPath.documentId(), "desc")
        .limit(FALLBACK_SCAN_LIMIT);
      const fbSnap = await fallbackQuery.get();
      const all = fbSnap.docs.map(
        (d: QueryDocumentSnapshot) => ({
          id: d.id,
          ...(d.data() as any),
        })
      );
      let filtered = all.filter((d: { [key: string]: any }) => {
        const computeAge = (): number | null => {
          const dt = deriveDateFromAny(d.dateOfBirth);
          if (!dt) {
            if (typeof d.age === "number" && !Number.isNaN(d.age)) return d.age;
            if (typeof d.age === "string") {
              const num = parseInt(d.age, 10);
              if (!Number.isNaN(num)) return num;
            }
            return null;
          }
          return robustCalculateAge(dt);
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
      const currentPage = page ?? 0;
      const size = pageSize ?? 20;
      if (!cursor && currentPage > 0) filtered = filtered.slice(currentPage * size);
      filtered = filtered.slice(0, size);
      return { docs: filtered, scanned: all.length };
    }

    let docs: any[] = [];
    let primaryAnsweredOrderingApplied = false;
    let primaryBoostOrderingApplied = false;
    try {
      docs = await runPrimaryQuery();
      primaryAnsweredOrderingApplied = includeAnsweredOrdering;
      primaryBoostOrderingApplied = includeBoostOrdering;
    } catch (err: any) {
      if (isIndexMissing(err)) {
        const fb = await runFallbackScan();
        docs = fb.docs;
        if (!total) total = fb.scanned;
        primaryAnsweredOrderingApplied = false;
      } else {
        throw err;
      }
    }

    // Apply city substring filtering
    if (cityFilter) {
      docs = docs.filter(
        (d: any) =>
          d.city &&
          typeof d.city === "string" &&
          d.city.toLowerCase().includes(cityFilter)
      );
    }

    // Extra age filtering pass
    if (typeof ageMin === "number" || typeof ageMax === "number") {
      const derive = (d: any): number | null => {
        const dt = deriveDateFromAny(d.dateOfBirth);
        if (!dt) {
          if (typeof d.age === "number" && !Number.isNaN(d.age)) return d.age;
          if (typeof d.age === "string") {
            const num = parseInt(d.age, 10);
            if (!Number.isNaN(num)) return num;
          }
          return null;
        }
        return robustCalculateAge(dt);
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
      const currentPage = page ?? 0;
      const size = pageSize ?? 20;
      total = docs.length + (cursor ? 0 : currentPage * size);
    }

    // Apply in-memory weighting
    if (!primaryBoostOrderingApplied || !primaryAnsweredOrderingApplied) {
      try {
        docs.sort((a: any, b: any) => {
          const nowTs = nowTimestamp();
          const aBoostActive =
            typeof a.boostedUntil === "number" && a.boostedUntil > nowTs;
          const bBoostActive =
            typeof b.boostedUntil === "number" && b.boostedUntil > nowTs;
          if (aBoostActive !== bBoostActive) return aBoostActive ? -1 : 1;
          const ac =
            typeof a.answeredIcebreakersCount === "number"
              ? a.answeredIcebreakersCount
              : 0;
          const bc =
            typeof b.answeredIcebreakersCount === "number"
              ? b.answeredIcebreakersCount
              : 0;
          if (bc !== ac) return bc - ac;
          const aCreated = typeof a.createdAt === "number" ? a.createdAt : 0;
          const bCreated = typeof b.createdAt === "number" ? b.createdAt : 0;
          if (bCreated !== aCreated) return bCreated - aCreated;
          return 0;
        });
      } catch { }
    }

    const getAccessibleImageUrl = async (urlOrPath: string): Promise<string> => {
      if (!urlOrPath) return "";
      if (urlOrPath.startsWith("/api/")) return urlOrPath;

      const bucketName = process.env.FIREBASE_STORAGE_BUCKET ||
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`;

      if (urlOrPath.includes("storage.googleapis.com")) {
        const urlWithoutQuery = urlOrPath.split("?")[0];
        const match = urlWithoutQuery.match(/storage\.googleapis\.com\/[^/]+\/(.+)/);
        if (match && match[1]) {
          const storagePath = decodeURIComponent(match[1]);
          try {
            const file = adminStorage.bucket(bucketName).file(storagePath);
            const [signedUrl] = await file.getSignedUrl({
              action: "read",
              expires: nowTimestamp() + 60 * 60 * 1000,
            });
            return signedUrl;
          } catch {
            return urlOrPath;
          }
        }
      }

      if (urlOrPath.startsWith("users/") || urlOrPath.startsWith("profileImages/")) {
        try {
          const file = adminStorage.bucket(bucketName).file(urlOrPath);
          const [signedUrl] = await file.getSignedUrl({
            action: "read",
            expires: nowTimestamp() + 60 * 60 * 1000,
          });
          return signedUrl;
        } catch {
          return `https://storage.googleapis.com/${bucketName}/${urlOrPath}`;
        }
      }

      return urlOrPath;
    };

    const profiles = await Promise.all(
      docs
        .filter((d) => !d.banned && !d.hiddenFromSearch)
        .map(async (d) => {
          const rawUrls: string[] = d.profileImageUrls || [];
          const accessibleUrls = await Promise.all(
            rawUrls.slice(0, 5).map((url: string) => getAccessibleImageUrl(url))
          );

          return {
            userId: d.id,
            email: d.email,
            profile: {
              fullName: d.fullName || "",
              city: d.city,
              dateOfBirth: d.dateOfBirth,
              profileCompletionPercentage: d.profileCompletionPercentage,
              hiddenFromSearch: d.hiddenFromSearch,
              boostedUntil: d.boostedUntil,
              subscriptionPlan: d.subscriptionPlan,
              hideFromFreeUsers: d.hideFromFreeUsers,
              profileImageUrls: accessibleUrls,
              hasSpotlightBadge: d.hasSpotlightBadge,
              spotlightBadgeExpiresAt: d.spotlightBadgeExpiresAt,
              answeredIcebreakersCount: d.answeredIcebreakersCount,
            },
          };
        })
    );

    let nextCursor: string | undefined = undefined;
    if (docs.length === pageSize) {
      const last = docs[docs.length - 1];
      const lastAnswered =
        typeof last?.answeredIcebreakersCount === "number"
          ? last.answeredIcebreakersCount
          : 0;
      if (last?.createdAt) {
        if (includeAnsweredOrdering && includeBoostOrdering) {
          const lastBoost =
            typeof last.boostedUntil === "number" ? last.boostedUntil : 0;
          nextCursor = `${encodeURIComponent(`${lastBoost}|${lastAnswered}|${last.createdAt}|${last.id}`)}`;
        } else if (includeAnsweredOrdering) {
          nextCursor = `${encodeURIComponent(`${lastAnswered}|${last.createdAt}|${last.id}`)}`;
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
      correlationId: ctx.correlationId,
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
    }, 200, ctx.correlationId);
  } catch (error) {
    console.error("Firestore search API error", error);
    return errorResponse("Search service temporarily unavailable", 500, { correlationId: ctx.correlationId });
  }
}, {
  rateLimit: { identifier: "search", maxRequests: 60 }
});
