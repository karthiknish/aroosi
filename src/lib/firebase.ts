// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  getIdToken,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Firebase configuration now sourced from environment variables to avoid hardcoding secrets.
// NEXT_PUBLIC_ prefix exposes only non-sensitive values required for client SDK initialization.
// Ensure these are defined in your .env.local (and not committed) and matching values in deployment env.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
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
          document.cookie = `firebaseAuthToken=${token}; path=/;`;
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

export { app, auth, db, storage, analytics };