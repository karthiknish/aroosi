// Simplified Firebase Admin-only helper (client SDK separately handled elsewhere if needed)

// Firebase Admin initialization (server-side only)
// Ensure this file is imported only in server contexts (API routes, server components).
import { adminDb, adminAuth, adminStorage } from '@/lib/firebaseAdminInit';
// Re-export specific admin handles for convenience
export { adminAuth, adminStorage };

const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

// Re-export unified admin handles (db kept for existing imports)
export const db: any = adminDb;
export const COLLECTIONS = { USERS: 'users' } as const;

export type FirestoreUserProfile = {
  email: string;
  clerkId?: string;
  createdAt: number;
  updatedAt: number;
  role?: string;
  banned?: boolean;
  emailVerified?: boolean;
  isProfileComplete?: boolean;
  isOnboardingComplete?: boolean;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  preferredGender?: string;
  city?: string;
  country?: string;
  height?: string;
  maritalStatus?: string;
  education?: string;
  occupation?: string;
  annualIncome?: number;
  aboutMe?: string;
  motherTongue?: string;
  religion?: string;
  ethnicity?: string;
  phoneNumber?: string;
  diet?: string;
  smoking?: string;
  drinking?: string;
  physicalStatus?: string;
  partnerPreferenceAgeMin?: number | string;
  partnerPreferenceAgeMax?: number | string;
  partnerPreferenceCity?: string[];
  profileImageUrls?: string[];
  subscriptionPlan?: string;
  subscriptionExpiresAt?: number;
  boostsRemaining?: number;
  boostedUntil?: number;
  hasSpotlightBadge?: boolean;
  spotlightBadgeExpiresAt?: number;
  hideFromFreeUsers?: boolean;
  // Stripe billing fields (added during migration off Convex)
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
};

export async function getUserByEmail(email: string) {
  const snap = await db.collection(COLLECTIONS.USERS).where('email', '==', email.toLowerCase()).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...(doc.data() as FirestoreUserProfile) };
}

export async function upsertUser(email: string, data: Partial<FirestoreUserProfile>) {
  const existing = await getUserByEmail(email);
  const now = Date.now();
  if (existing) {
    await db.collection(COLLECTIONS.USERS).doc(existing.id).set({ ...existing, ...data, updatedAt: now }, { merge: true });
    const updated = await db.collection(COLLECTIONS.USERS).doc(existing.id).get();
    return { id: existing.id, ...(updated.data() as FirestoreUserProfile) };
  }
  const docRef = db.collection(COLLECTIONS.USERS).doc();
  await docRef.set({ email: email.toLowerCase(), createdAt: now, updatedAt: now, ...data });
  const created = await docRef.get();
  return { id: docRef.id, ...(created.data() as FirestoreUserProfile) };
}

// Verify a Firebase ID token (returns decoded token or throws)
export async function verifyFirebaseIdToken(idToken: string) {
  return await adminAuth.verifyIdToken(idToken);
}

// Minimal helper to fetch user document from Firestore (used by firebase auth wrappers)
export async function getFirebaseUser(userId: string) {
  try {
    const doc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...(doc.data() as any) };
  } catch (e) {
    console.error("getFirebaseUser error", e);
    return null;
  }
}