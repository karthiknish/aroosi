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
  let query: FirebaseFirestore.Query = db.collection(COLLECTIONS.USERS);
  if (filters.gender) query = query.where('gender', '==', filters.gender);
  if (filters.minAge) query = query.where('age', '>=', filters.minAge);
  if (filters.maxAge) query = query.where('age', '<=', filters.maxAge);
  if (filters.city) query = query.where('city', '==', filters.city);
  if (filters.country) query = query.where('country', '==', filters.country);
  if (filters.religion) query = query.where('religion', '==', filters.religion);
  if (filters.caste) query = query.where('caste', '==', filters.caste);
  if (filters.education) query = query.where('education', '==', filters.education);
  if (filters.occupation) query = query.where('occupation', '==', filters.occupation);
  if (filters.minIncome !== undefined) query = query.where('annualIncome', '>=', filters.minIncome);
  if (filters.maxIncome !== undefined) query = query.where('annualIncome', '<=', filters.maxIncome);
  if (filters.hasPhoto) query = query.where('profileImageUrls', '!=', null);
  if (filters.isPremium) query = query.where('subscriptionPlan', 'in', ['premium', 'premium_plus']);
  query = query.orderBy('lastActiveAt', 'desc');
  if (filters.cursor) {
    // Fetch the cursor document to start after
    const cursorDoc = await db.collection(COLLECTIONS.USERS).doc(filters.cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }
  const pageSize = filters.limit && filters.limit > 0 ? filters.limit : 25;
  query = query.limit(pageSize + 1); // fetch one extra to detect next page
  const snapshot = await query.get();
  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  const sliced = hasMore ? docs.slice(0, pageSize) : docs;
  const users = sliced.map(d => ({ id: d.id, ...(d.data() as any) }));
  const nextCursor = hasMore ? sliced[sliced.length - 1].id : undefined;
  return { users, nextCursor };
}
