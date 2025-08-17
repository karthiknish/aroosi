// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence,
  onAuthStateChanged,
  getIdToken
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

// Set persistence to local storage
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Error setting Firebase auth persistence:", error);
  });
}

// Function to get the current user's ID token and set it in cookies
export async function setAuthTokenCookie() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await getIdToken(user, true);
          // In a real implementation, you would send this token to your server
          // to set it as an HTTP-only cookie for security
          document.cookie = `firebaseAuthToken=${token}; path=/;`;
        } catch (error) {
          console.error("Error getting Firebase ID token:", error);
        }
      } else {
        // Clear the auth token cookie when user signs out
        document.cookie = `firebaseAuthToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
      unsubscribe();
      resolve(null);
    });
  });
}

export { app, auth, db, storage, analytics };