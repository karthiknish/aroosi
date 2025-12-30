import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";
import { nowTimestamp } from "@/lib/utils/timestamp";
import { db } from "@/lib/firebaseAdmin";
import {
  COL_MATCHES,
  COL_RECOMMENDATIONS,
  buildRecommendationItem,
} from "@/lib/firestoreSchema";

const WEIGHTS = {
  mutualGenderPreference: 12,
  singleSidedGenderPreference: 6,
  cityMatch: 5,
  interestOverlap: 2,
  recentActivityBuckets: [8, 4, 2],
  planBoosts: {
    premiumPlus: 15,
    premium_plus: 15,
    premium: 8,
  } as Record<string, number>,
};

const MAX_INTEREST_SCORE = 40;

interface RecommendationCandidate {
  id: string;
  fullName?: string;
  city?: string;
  profileImageUrls?: string[];
  score: number;
  createdAt: number;
  lastActiveAt?: number;
  baseScore?: number;
  subscriptionPlan?: string;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
  }
  return h >>> 0;
}

function shuffleInPlace<T>(arr: T[], rng: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function enforceCityDiversity(list: RecommendationCandidate[], maxRun = 2): RecommendationCandidate[] {
  const out: RecommendationCandidate[] = [];
  for (let i = 0; i < list.length; i++) {
    const cand = list[i];
    const last1 = out[out.length - 1];
    const last2 = out[out.length - 2];
    if (last1 && last2 && last1.city && last2.city && cand.city && last1.city === last2.city && last1.city === cand.city) {
      let swapIndex = -1;
      for (let j = i + 1; j < list.length; j++) {
        if (list[j].city !== cand.city) { swapIndex = j; break; }
      }
      if (swapIndex !== -1) {
        const alt = list.splice(swapIndex, 1)[0];
        out.push(alt);
        list.splice(i + 1, 0, cand);
        continue;
      }
    }
    out.push(cand);
  }
  return out;
}

const CACHE_ALGO = "heuristic_v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { searchParams } = new URL(ctx.request.url);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
    const cursor = searchParams.get("cursor");

    try {
      const startedAt = nowTimestamp();
      const isFirstPage = !cursor;
      const useCache = isFirstPage && limit === 20;

      if (useCache) {
        const existing = await db
          .collection(COL_RECOMMENDATIONS)
          .where("userId", "==", userId)
          .where("algorithm", "==", CACHE_ALGO)
          .where("expiresAt", ">", nowTimestamp())
          .orderBy("expiresAt", "desc")
          .limit(1)
          .get();
        
        if (!existing.empty) {
          const doc = existing.docs[0].data() as any;
          if (Array.isArray(doc.payload) && doc.payload.length) {
            return successResponse({
              recommendations: doc.payload.slice(0, limit),
              cursor: null,
              hasMore: doc.payload.length > limit,
              count: Math.min(limit, doc.payload.length),
              meta: { cached: true, algorithm: CACHE_ALGO, diversity: doc.diversity, durationMs: nowTimestamp() - startedAt },
            }, 200, ctx.correlationId);
          }
        }
      }

      const userSnap = await db.collection("users").doc(userId).get();
      if (!userSnap.exists) {
        return errorResponse("User profile not found", 404, { correlationId: ctx.correlationId });
      }
      const userProfile = userSnap.data() as any;

      const [matchSnap1, matchSnap2, blockedForwardSnap, blockedReverseSnap] = await Promise.all([
        db.collection(COL_MATCHES).where("user1Id", "==", userId).get(),
        db.collection(COL_MATCHES).where("user2Id", "==", userId).get(),
        db.collection("blocks").where("blockerId", "==", userId).get(),
        db.collection("blocks").where("blockedUserId", "==", userId).get(),
      ]);

      const excludedIds = new Set<string>();
      matchSnap1.docs.forEach((d: any) => excludedIds.add((d.data() as any).user2Id));
      matchSnap2.docs.forEach((d: any) => excludedIds.add((d.data() as any).user1Id));
      blockedForwardSnap.docs.forEach((d: any) => excludedIds.add((d.data() as any).blockedUserId));
      blockedReverseSnap.docs.forEach((d: any) => excludedIds.add((d.data() as any).blockerId));
      excludedIds.add(userId);

      let baseQuery: FirebaseFirestore.Query = db.collection("users").orderBy("createdAt", "desc");
      if (cursor) {
        const cursorNum = Number(cursor);
        if (!isNaN(cursorNum)) baseQuery = baseQuery.startAfter(cursorNum);
      }

      const overFetch = Math.min(5 * limit, 200);
      const snapshot = await baseQuery.limit(overFetch).get();

      const interestSet: Set<string> = Array.isArray(userProfile.interests)
        ? new Set<string>(userProfile.interests)
        : new Set();

      const scored: RecommendationCandidate[] = [];
      const now = nowTimestamp();

      for (const doc of snapshot.docs) {
        if (excludedIds.has(doc.id)) continue;
        const data = doc.data() as any;
        if (!data?.fullName || !Array.isArray(data?.profileImageUrls) || data.profileImageUrls.length === 0) continue;

        let score = 0;
        const userGender = userProfile.gender;
        const userPref = userProfile.preferredGender;
        const candGender = data.gender;
        const candPref = data.preferredGender;

        if (userGender && candPref === userGender && candGender && userPref === candGender) {
          score += WEIGHTS.mutualGenderPreference;
        } else {
          if (userGender && candPref === userGender) score += WEIGHTS.singleSidedGenderPreference;
          if (candGender && userPref === candGender) score += WEIGHTS.singleSidedGenderPreference;
        }
        if (userProfile.city && data.city === userProfile.city) score += WEIGHTS.cityMatch;

        if (interestSet.size && Array.isArray(data.interests) && data.interests.length) {
          const overlap = data.interests.filter((i: string) => interestSet.has(i));
          if (overlap.length) {
            score += Math.min(overlap.length * WEIGHTS.interestOverlap, MAX_INTEREST_SCORE);
          }
        }

        if (typeof data.lastActiveAt === "number") {
          const ageMs = now - data.lastActiveAt;
          if (ageMs < 15 * 60_000) score += WEIGHTS.recentActivityBuckets[0];
          else if (ageMs < 2 * 60 * 60_000) score += WEIGHTS.recentActivityBuckets[1];
          else if (ageMs < 24 * 60 * 60_000) score += WEIGHTS.recentActivityBuckets[2];
        }

        scored.push({
          id: doc.id,
          fullName: data.fullName,
          city: data.city,
          profileImageUrls: data.profileImageUrls || [],
          score,
          baseScore: score,
          createdAt: data.createdAt || 0,
          lastActiveAt: data.lastActiveAt,
          subscriptionPlan: data.subscriptionPlan,
        });
      }

      for (const c of scored) {
        if (c.subscriptionPlan) {
          const boost = WEIGHTS.planBoosts[c.subscriptionPlan];
          if (boost) c.score += boost;
        }
      }

      scored.sort((a, b) => b.score - a.score || b.createdAt - a.createdAt);

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

      const diversified = enforceCityDiversity(banded, 2);
      const selected = diversified.slice(0, limit);
      const nextCursor = selected.length === limit ? String(selected[selected.length - 1].createdAt) : null;

      if (useCache) {
        try {
          const payload = diversified.slice(0, 100);
          const recDoc = buildRecommendationItem(userId, payload[0]?.id || userId, payload[0]?.score || 0, CACHE_ALGO, ["batch"], CACHE_TTL_MS);
          await db.collection(COL_RECOMMENDATIONS).add({ ...recDoc, payload, diversity: "city" });
        } catch {}
      }

      return successResponse({
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
          durationMs: nowTimestamp() - startedAt,
        },
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("recommendations GET error", { error, correlationId: ctx.correlationId });
      return errorResponse("Failed to fetch recommendations", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "recommendations_get", maxRequests: 30 }
  }
);
