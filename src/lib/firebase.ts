// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  onIdTokenChanged,
  getIdToken,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Firebase configuration now sourced from environment variables to avoid hardcoding secrets.
// NEXT_PUBLIC_ prefix exposes only non-sensitive values required for client SDK initialization.
// Ensure these are defined in your .env.local (and not committed) and matching values in deployment env.
// Support optional custom auth domain (e.g. auth.example.com) if provided.
// To show your own domain instead of PROJECT_ID.firebaseapp.com during Google OAuth
// flows, you must:
// 1. Add the custom domain in Firebase Hosting (verify DNS & deploy).
// 2. Add the domain under Authentication > Settings > Authorized domains.
// 3. (If using Identity Platform advanced features) ensure the domain is also authorized there.
// 4. Set NEXT_PUBLIC_FIREBASE_CUSTOM_AUTH_DOMAIN to that domain (e.g. auth.example.com).
// 5. Redeploy. The popup / redirect handler will use https://auth.example.com/__/auth/handler.
const resolvedAuthDomain =
  process.env.NEXT_PUBLIC_FIREBASE_CUSTOM_AUTH_DOMAIN?.trim() ||
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: resolvedAuthDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Basic runtime guard (dev only) to surface misconfiguration early.
if (process.env.NODE_ENV !== "production") {
  const missing: string[] = [];
  for (const [k, v] of Object.entries(firebaseConfig)) {
    if (!v) missing.push(k);
  }
  if (missing.length) {
    // Fail fast to avoid silent misconfig that becomes auth/configuration-not-found
    // eslint-disable-next-line no-console
    console.error(
      "[firebase] Missing required Firebase config keys:",
      missing.join(", ")
    );
    throw new Error(
      `Firebase configuration incomplete (missing: ${missing.join(", ")}). Check NEXT_PUBLIC_FIREBASE_* env vars and restart dev server.`
    );
  }
  // Warn if custom domain variable is set but not used (empty after trim)
  if (
    process.env.NEXT_PUBLIC_FIREBASE_CUSTOM_AUTH_DOMAIN !== undefined &&
    !process.env.NEXT_PUBLIC_FIREBASE_CUSTOM_AUTH_DOMAIN.trim()
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      "[firebase] NEXT_PUBLIC_FIREBASE_CUSTOM_AUTH_DOMAIN is defined but blank; falling back to default auth domain."
    );
  }
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

// Set persistence (browser only)
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Error setting Firebase auth persistence:", error);
  });
}

// Optional helper to set auth token cookie (client only)
export async function setAuthTokenCookie() {
  if (typeof window === "undefined") return;
  return new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const token = await getIdToken(user, true);
          const baseDomain = process.env.NEXT_PUBLIC_COOKIE_BASE_DOMAIN?.trim(); // optional, non-HttpOnly client write
          document.cookie =
            `firebaseAuthToken=${token}; path=/;` +
            (baseDomain ? ` domain=${baseDomain};` : "");
        } else {
          document.cookie = `firebaseAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error getting Firebase ID token:", err);
      } finally {
        unsubscribe();
        resolve();
      }
    });
  });
}

// Continuous token refresh: keep firebaseAuthToken cookie up to date (ID tokens ~1h lifetime)
// This listener updates the cookie whenever Firebase rotates the ID token.
if (typeof window !== "undefined") {
  let lastSet: string | null = null;
  onIdTokenChanged(auth, async (user) => {
    try {
      if (!user) {
        if (lastSet !== null) {
          document.cookie = `firebaseAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          lastSet = null;
        }
        return;
      }
      // Force refresh if token close to expiry or every 50 minutes
      const token = await user.getIdToken(/* forceRefresh */ false);
      if (token && token !== lastSet) {
        const baseDomain = process.env.NEXT_PUBLIC_COOKIE_BASE_DOMAIN?.trim();
        document.cookie =
          `firebaseAuthToken=${token}; path=/;` +
          (baseDomain ? ` domain=${baseDomain};` : "");
        lastSet = token;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[firebase] Failed refreshing ID token cookie", e);
    }
  });
}

export { app, auth, db, storage, analytics };