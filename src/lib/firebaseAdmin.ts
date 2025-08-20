// Simplified Firebase Admin-only helper (client SDK separately handled elsewhere if needed)

// Firebase Admin initialization (server-side only)
// Ensure this file is imported only in server contexts (API routes, server components).
import { adminDb, adminAuth, adminStorage } from '@/lib/firebaseAdminInit';
// Re-export specific admin handles for convenience
export { adminAuth, adminStorage };

const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

// Re-export unified admin handles (db kept for existing imports)
export const db: any = adminDb;
export const COLLECTIONS = { USERS: "users", TASKS: "tasks" } as const;

export type FirestoreUserProfile = {
  email: string;
  clerkId?: string;
  createdAt: number;
  updatedAt: number;
  role?: string;
  banned?: boolean;
  emailVerified?: boolean;
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
  try {
    if (!idToken || typeof idToken !== "string") {
      throw new Error("Missing idToken");
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    // Development diagnostics: verify project / issuer alignment.
    if (process.env.NODE_ENV !== "production") {
      const expectedProject =
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        process.env.FIREBASE_PROJECT_ID;
      const issuer: string | undefined = (decoded as any).iss;
      const aud: string | undefined = (decoded as any).aud;
      const uid: string | undefined = (decoded as any).uid;
      const mismatch: string[] = [];
      if (expectedProject && issuer && !issuer.includes(expectedProject))
        mismatch.push("issuer");
      if (expectedProject && aud && aud !== expectedProject)
        mismatch.push("aud");
      if (mismatch.length) {
        // eslint-disable-next-line no-console
        console.warn("[verifyFirebaseIdToken] Project mismatch", {
          expectedProject,
          issuer,
          aud,
          uid,
          mismatch,
        });
      }
    }
    return decoded;
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") {
      // Helpful structured troubleshooting hints; avoid logging raw token.
      // eslint-disable-next-line no-console
      console.error("[verifyFirebaseIdToken] Failed", {
        message: err?.message,
        code: err?.code,
        name: err?.name,
        suggestions: [
          "Confirm client & admin SDK use the same Firebase project ID",
          "Ensure FIREBASE_SERVICE_ACCOUNT (or GOOGLE_APPLICATION_CREDENTIALS) is configured",
          "If using emulator, set FIREBASE_AUTH_EMULATOR_HOST and skip verification for emulator tokens",
          "Check system clock skew (<5 minutes)",
          "Force refresh token on client: currentUser.getIdToken(true)",
        ],
      });
    }
    throw err;
  }
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