import { NextRequest } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import {
  COL_MATCHES,
  COL_RECOMMENDATIONS,
  buildRecommendationItem,
} from "@/lib/firestoreSchema";

// Lightweight weighting constants (tweakable without redeploy logic changes)
const WEIGHTS = {
  mutualGenderPreference: 12,
  singleSidedGenderPreference: 6,
  cityMatch: 5,
  interestOverlap: 2, // per overlapping interest
  recentActivityBuckets: [8, 4, 2], // <15m, <2h, <24h
  planBoosts: {
    premiumPlus: 15,
    premium_plus: 15, // alternate naming safeguard
    premium: 8,
  } as Record<string, number>,
};

// Maximum multiplier applied for large interest overlap to avoid domination
const MAX_INTEREST_SCORE = 40; // cap interest contribution

interface RecommendationCandidate {
  id: string;
  fullName?: string;
  city?: string;
  profileImageUrls?: string[];
  score: number;
  createdAt: number;
  lastActiveAt?: number;
  baseScore?: number; // score before boosts / randomization
  subscriptionPlan?: string;
}

// Deterministic RNG (mulberry32) for per-request stable shuffling
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1); // eslint-disable-line no-bitwise
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); // eslint-disable-line no-bitwise
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // eslint-disable-line no-bitwise
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i); // eslint-disable-line no-bitwise
  }
  return h >>> 0; // eslint-disable-line no-bitwise
}

function shuffleInPlace<T>(arr: T[], rng: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Diversity: avoid >2 consecutive same-city profiles by lookahead swap.
function enforceCityDiversity(
  list: RecommendationCandidate[],
  maxRun = 2
): RecommendationCandidate[] {
  const out: RecommendationCandidate[] = [];
  for (let i = 0; i < list.length; i++) {
    const cand = list[i];
    const last1 = out[out.length - 1];
    const last2 = out[out.length - 2];
    if (
      last1 &&
      last2 &&
      last1.city &&
      last2.city &&
      cand.city &&
      last1.city === last2.city &&
      last1.city === cand.city
    ) {
      let swapIndex = -1;
      for (let j = i + 1; j < list.length; j++) {
        if (list[j].city !== cand.city) {
          swapIndex = j;
          break;
        }
      }
      if (swapIndex !== -1) {
        const alt = list.splice(swapIndex, 1)[0];
        out.push(alt);
        list.splice(i + 1, 0, cand); // reinsert current later
        continue;
      }
    }
    out.push(cand);
  }
  return out;
}

// Simple cache parameters
const CACHE_ALGO = "heuristic_v1"; // algorithm key for cache segregation
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const startedAt = Date.now();
    const correlationId = Math.random().toString(36).slice(2, 10);
    const session = await requireSession(request);
    if ("errorResponse" in session) return session.errorResponse;
    const { userId } = session;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get("limit") || 20))
    );
    const cursor = searchParams.get("cursor"); // expect createdAt millis (descending pagination)

    // Try cache first (if no cursor and default limit)
    const isFirstPage = !cursor;
    const useCache = isFirstPage && limit === 20; // only cache canonical request shape
    if (useCache) {
      const existing = await db
        .collection(COL_RECOMMENDATIONS)
        .where("userId", "==", userId)
        .where("algorithm", "==", CACHE_ALGO)
        .where("expiresAt", ">", Date.now())
        .orderBy("expiresAt", "desc")
        .limit(1)
        .get();
      if (!existing.empty) {
        const doc = existing.docs[0].data() as any;
        if (Array.isArray(doc.payload) && doc.payload.length) {
          console.info("Recommendations cache hit", {
            scope: "recommendations.get",
            type: "cache_hit",
            correlationId,
            userId,
            algorithm: CACHE_ALGO,
            payloadSize: doc.payload.length,
            durationMs: Date.now() - startedAt,
          });
          return successResponse({
            recommendations: doc.payload.slice(0, limit),
            cursor: null,
            hasMore: doc.payload.length > limit,
            count: Math.min(limit, doc.payload.length),
            meta: {
              cached: true,
              algorithm: CACHE_ALGO,
              diversity: doc.diversity,
              correlationId,
              durationMs: Date.now() - startedAt,
            },
          });
        }
      }
    }

    // Fetch current user profile for preference heuristics
    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) return errorResponse("User profile not found", 404);
    const userProfile = userSnap.data() as any;

    // Parallel preloads: matches to exclude & block relations
    const [matchSnap1, matchSnap2, blockedForwardSnap, blockedReverseSnap] =
      await Promise.all([
        db.collection(COL_MATCHES).where("user1Id", "==", userId).get(),
        db.collection(COL_MATCHES).where("user2Id", "==", userId).get(),
        db.collection("blocks").where("blockerId", "==", userId).get(),
        db.collection("blocks").where("blockedUserId", "==", userId).get(),
      ]);

    const excludedIds = new Set<string>();
    matchSnap1.docs.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => {
      const m = d.data() as any;
      excludedIds.add(m.user2Id);
    });
    matchSnap2.docs.forEach((d: FirebaseFirestore.QueryDocumentSnapshot) => {
      const m = d.data() as any;
      excludedIds.add(m.user1Id);
    });
    blockedForwardSnap.docs.forEach(
      (d: FirebaseFirestore.QueryDocumentSnapshot) => {
        const b = d.data() as any;
        excludedIds.add(b.blockedUserId);
      }
    );
    blockedReverseSnap.docs.forEach(
      (d: FirebaseFirestore.QueryDocumentSnapshot) => {
        const b = d.data() as any;
        excludedIds.add(b.blockerId);
      }
    );
    excludedIds.add(userId); // never recommend self

    // Base candidate query: newest profiles first (createdAt descending)
    let baseQuery: FirebaseFirestore.Query = db
      .collection("users")
      .orderBy("createdAt", "desc");
    if (cursor) {
      const cursorNum = Number(cursor);
      if (!isNaN(cursorNum)) baseQuery = baseQuery.startAfter(cursorNum);
    }

    // Over-fetch to allow filtering & scoring; use a modest multiplier to keep latency low
    const overFetch = Math.min(5 * limit, 200);
    const snapshot = await baseQuery.limit(overFetch).get();

    const interestSet: Set<string> = Array.isArray(userProfile.interests)
      ? new Set<string>(userProfile.interests)
      : new Set();

    const scored: RecommendationCandidate[] = [];
    const now = Date.now();
    for (const doc of snapshot.docs) {
      if (excludedIds.has(doc.id)) continue;
      const data = doc.data() as any;
      // Basic guard: require minimal profile completeness
      if (
        !data?.fullName ||
        !Array.isArray(data?.profileImageUrls) ||
        data.profileImageUrls.length === 0
      )
        continue;

      let score = 0;
      // Gender preference mutual / one-sided
      const userGender = userProfile.gender;
      const userPref = userProfile.preferredGender;
      const candGender = data.gender;
      const candPref = data.preferredGender;
      if (
        userGender &&
        candPref === userGender &&
        candGender &&
        userPref === candGender
      ) {
        score += WEIGHTS.mutualGenderPreference; // mutual alignment
      } else {
        if (userGender && candPref === userGender)
          score += WEIGHTS.singleSidedGenderPreference;
        if (candGender && userPref === candGender)
          score += WEIGHTS.singleSidedGenderPreference;
      }
      if (userProfile.city && data.city === userProfile.city)
        score += WEIGHTS.cityMatch;

      // Interest overlap
      if (
        interestSet.size &&
        Array.isArray(data.interests) &&
        data.interests.length
      ) {
        const overlap = data.interests.filter((i: string) =>
          interestSet.has(i)
        );
        if (overlap.length) {
          const interestScore = Math.min(
            overlap.length * WEIGHTS.interestOverlap,
            MAX_INTEREST_SCORE
          );
          score += interestScore;
        }
      }

      // Activity recency boost (if lastActiveAt tracked)
      if (typeof data.lastActiveAt === "number") {
        const ageMs = now - data.lastActiveAt;
        if (ageMs < 15 * 60_000) score += WEIGHTS.recentActivityBuckets[0];
        else if (ageMs < 2 * 60 * 60_000)
          score += WEIGHTS.recentActivityBuckets[1];
        else if (ageMs < 24 * 60 * 60_000)
          score += WEIGHTS.recentActivityBuckets[2];
      }

      scored.push({
        id: doc.id,
        fullName: data.fullName,
        city: data.city,
        profileImageUrls: data.profileImageUrls || [],
        score, // temporary base score; plan & randomization adjustments later
        baseScore: score,
        createdAt: data.createdAt || 0,
        lastActiveAt: data.lastActiveAt,
        subscriptionPlan: data.subscriptionPlan,
      });
      if (scored.length >= limit * 2) {
        /* enough for ranking */
      }
    }
    // Apply plan-based boosts
    for (const c of scored) {
      if (c.subscriptionPlan) {
        const boost = WEIGHTS.planBoosts[c.subscriptionPlan];
        if (boost) c.score += boost;
      }
    }
    // Sort by boosted score first
    scored.sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);

    // Bucketize by score band width=5 and shuffle within buckets for lightweight diversity
    const buckets = new Map<number, RecommendationCandidate[]>();
    for (const c of scored) {
      const band = Math.floor(c.score / 5);
      if (!buckets.has(band)) buckets.set(band, []);
      buckets.get(band)!.push(c);
    }
    const seedKey = `${userId}:${cursor || "root"}:${scored.length}`;
    const rng = mulberry32(hashSeed(seedKey));
    const orderedBands = Array.from(buckets.keys()).sort((a, b) => b - a);
    const banded: RecommendationCandidate[] = [];
    for (const band of orderedBands) {
      const arr = buckets.get(band)!;
      if (arr.length > 1) shuffleInPlace(arr, rng);
      banded.push(...arr);
    }

    // City diversity pass
    const diversified = enforceCityDiversity(banded, 2);
    const selected = diversified.slice(0, limit);

    const nextCursor =
      selected.length === limit
        ? String(selected[selected.length - 1].createdAt)
        : null;

    // Persist cache snapshot if first page & canonical shape
    if (useCache) {
      try {
        const ttlMs = CACHE_TTL_MS;
        const payload = diversified.slice(0, 100); // store up to 100 candidates
        const recDoc = buildRecommendationItem(
          userId,
          payload[0]?.id || userId,
          payload[0]?.score || 0,
          CACHE_ALGO,
          ["batch"],
          ttlMs
        );
        // augment with payload & diversity meta
        await db.collection(COL_RECOMMENDATIONS).add({
          ...recDoc,
            // store full array separately
          payload,
          diversity: "city",
        });
      } catch (e) {
        // swallow cache errors; continue
      }
    }

    const responsePayload = {
      recommendations: selected,
      cursor: nextCursor,
      hasMore: Boolean(nextCursor),
      count: selected.length,
      meta: {
        appliedPlanBoost: true,
        bucketBands: orderedBands.length,
        seed: seedKey,
        diversity: "city",
        cached: false,
        algorithm: CACHE_ALGO,
        correlationId,
        durationMs: Date.now() - startedAt,
      },
    };

    console.info("Recommendations computed", {
      scope: "recommendations.get",
      type: "cache_miss_compute",
      correlationId,
      userId,
      algorithm: CACHE_ALGO,
      requestedLimit: limit,
      returned: selected.length,
      totalCandidates: scored.length,
      bucketBands: orderedBands.length,
      durationMs: Date.now() - startedAt,
      cursorProvided: Boolean(cursor),
    });
    return successResponse(responsePayload);
  } catch (error) {
    return errorResponse("Failed to fetch recommendations", 500, {
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
