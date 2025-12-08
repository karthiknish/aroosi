// Extracted search functions from monolithic userProfile.ts for maintainability.
import { db } from '@/lib/userProfile';
import { COLLECTIONS, UserDocument } from '@/lib/userProfile';

export interface UserSearchFilters {
  gender?: string;
  minAge?: number;
  maxAge?: number;
  city?: string;
  country?: string;
  religion?: string;
  caste?: string;
  education?: string;
  occupation?: string;
  minIncome?: number;
  maxIncome?: number;
  hasPhoto?: boolean;
  isPremium?: boolean;
  limit?: number;
  cursor?: string; // Firestore document ID to start after
}
export interface UserSearchResult {
  users: UserDocument[];
  nextCursor?: string; // last document ID for pagination
}

export async function searchUsers(filters: UserSearchFilters): Promise<UserSearchResult> {
  // Base query
  let base: FirebaseFirestore.Query = db.collection(COLLECTIONS.USERS);
  if (filters.gender) base = base.where("gender", "==", filters.gender);
  if (filters.minAge) base = base.where("age", ">=", filters.minAge);
  if (filters.maxAge) base = base.where("age", "<=", filters.maxAge);
  if (filters.city) base = base.where("city", "==", filters.city);
  if (filters.country) base = base.where("country", "==", filters.country);
  if (filters.religion) base = base.where("religion", "==", filters.religion);
  if (filters.caste) base = base.where("caste", "==", filters.caste);
  if (filters.education)
    base = base.where("education", "==", filters.education);
  if (filters.occupation)
    base = base.where("occupation", "==", filters.occupation);
  if (filters.minIncome !== undefined)
    base = base.where("annualIncome", ">=", filters.minIncome);
  if (filters.maxIncome !== undefined)
    base = base.where("annualIncome", "<=", filters.maxIncome);
  if (filters.hasPhoto) base = base.where("profileImageUrls", "!=", null);
  if (filters.isPremium)
    base = base.where("subscriptionPlan", "in", ["premium", "premium_plus"]);

  const hasAgeInequality = !!filters.minAge || !!filters.maxAge;
  // Ordering: align with new weighting strategy (answeredIcebreakersCount desc, recency fallback)
  // For this utility we keep lastActiveAt as primary freshness dimension while still weighting answers.
  // Index requirement examples:
  //   lastActiveAt DESC, answeredIcebreakersCount DESC, createdAt DESC, __name__ DESC
  //   age ASC, lastActiveAt DESC, answeredIcebreakersCount DESC, createdAt DESC, __name__ DESC (if age inequality)
  let query: FirebaseFirestore.Query;
  if (hasAgeInequality) {
    query = base
      .orderBy("age", "asc")
      .orderBy("lastActiveAt", "desc")
      .orderBy("answeredIcebreakersCount", "desc")
      .orderBy("createdAt", "desc")
      .orderBy("__name__", "desc");
  } else {
    query = base
      .orderBy("lastActiveAt", "desc")
      .orderBy("answeredIcebreakersCount", "desc")
      .orderBy("createdAt", "desc")
      .orderBy("__name__", "desc");
  }

  // Cursor format (parallel to main search):
  //   answered|createdAt|docId (no age inequality, ignoring lastActiveAt for stability) OR
  //   age|answered|createdAt|docId (with age inequality)
  if (filters.cursor) {
    const decoded = decodeURIComponent(filters.cursor);
    const parts = decoded.split("|");
    try {
      if (hasAgeInequality) {
        if (parts.length === 4) {
          const ageCur = Number(parts[0]);
          const answeredCur = Number(parts[1]);
          const createdAtCur = Number(parts[2]);
          const idCur = parts[3];
          if (
            !Number.isNaN(ageCur) &&
            !Number.isNaN(answeredCur) &&
            !Number.isNaN(createdAtCur)
          ) {
            query = query.startAfter(ageCur, answeredCur, createdAtCur, idCur);
          }
        }
      } else {
        if (parts.length === 3) {
          const answeredCur = Number(parts[0]);
          const createdAtCur = Number(parts[1]);
          const idCur = parts[2];
          if (!Number.isNaN(answeredCur) && !Number.isNaN(createdAtCur)) {
            query = query.startAfter(answeredCur, createdAtCur, idCur);
          }
        }
      }
    } catch {
      /* ignore malformed cursor */
    }
  }

  const pageSize = filters.limit && filters.limit > 0 ? filters.limit : 25;
  query = query.limit(pageSize + 1);
  let snap: FirebaseFirestore.QuerySnapshot;
  try {
    snap = await query.get();
  } catch (e: any) {
    // Fallback: drop answered ordering if index missing
    const msg = e?.message || "";
    const indexMissing =
      msg.includes("index") || msg.includes("FAILED_PRECONDITION");
    if (!indexMissing) throw e;
    if (hasAgeInequality) {
      const fallback = base
        .orderBy("age", "asc")
        .orderBy("lastActiveAt", "desc")
        .orderBy("createdAt", "desc")
        .orderBy("__name__", "desc")
        .limit(pageSize + 1);
      snap = await fallback.get();
    } else {
      const fallback = base
        .orderBy("lastActiveAt", "desc")
        .orderBy("createdAt", "desc")
        .orderBy("__name__", "desc")
        .limit(pageSize + 1);
      snap = await fallback.get();
    }
  }

  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const sliced = hasMore ? docs.slice(0, pageSize) : docs;
  const users = sliced.map((d) => ({ id: d.id, ...(d.data() as any) }));
  let nextCursor: string | undefined;
  if (hasMore) {
    const last = sliced[sliced.length - 1];
    const data: any = last.data();
    const answered =
      typeof data.answeredIcebreakersCount === "number"
        ? data.answeredIcebreakersCount
        : 0;
    if (hasAgeInequality && typeof data.age === "number" && data.createdAt) {
      nextCursor = encodeURIComponent(
        `${data.age}|${answered}|${data.createdAt}|${last.id}`
      );
    } else if (data.createdAt) {
      nextCursor = encodeURIComponent(
        `${answered}|${data.createdAt}|${last.id}`
      );
    }
  }
  return { users, nextCursor };
}
