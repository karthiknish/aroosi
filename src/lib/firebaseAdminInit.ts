// Centralized Firebase Admin initialization to avoid duplicate app inits.
import { getApps, initializeApp, cert, applicationDefault, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { getMessaging } from 'firebase-admin/messaging';

let app: App;

// Credential resolution priority:
// 1. FIREBASE_SERVICE_ACCOUNT (single-line JSON OR base64 if it does not start with '{')
// 2. FIREBASE_SERVICE_ACCOUNT_BASE64 (base64 JSON)
// 3. Application Default Credentials (gcloud / workload identity)
const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
const rawServiceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

function parseServiceAccount(): Record<string, any> | null {
  // Try explicit JSON env
  if (rawServiceAccount) {
    const trimmed = rawServiceAccount.trim();
    // Detect multi-line pretty JSON stored directly in .env (dotenv will only capture first line -> '{')
    if (trimmed === "{") {
      console.error(
        '[firebase-admin] FIREBASE_SERVICE_ACCOUNT appears truncated (only "{"). Make sure it is a single-line JSON or base64 encode it.'
      );
      return null;
    }
    try {
      // If it looks like base64 (no braces & length multiple of 4) attempt decode
      if (!trimmed.startsWith("{") && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
        try {
          const decoded = Buffer.from(trimmed, "base64").toString("utf8");
          return JSON.parse(decoded);
        } catch {
          // fall through
        }
      }
      return JSON.parse(trimmed);
    } catch (e) {
      console.error(
        "[firebase-admin] Failed to JSON.parse FIREBASE_SERVICE_ACCOUNT env. Falling back.",
        (e as Error).message
      );
    }
  }
  // Base64 variant
  if (rawServiceAccountB64) {
    try {
      const decoded = Buffer.from(rawServiceAccountB64, "base64").toString(
        "utf8"
      );
      return JSON.parse(decoded);
    } catch (e) {
      console.error(
        "[firebase-admin] Failed to decode FIREBASE_SERVICE_ACCOUNT_BASE64.",
        (e as Error).message
      );
    }
  }
  return null;
}

if (!getApps().length) {
  const svc = parseServiceAccount();
  try {
    if (svc) {
      app = initializeApp({
        credential: cert(svc),
        projectId: svc.project_id,
      } as any);
      // Ensure downstream Google libs see a project ID (some rely on GCLOUD_PROJECT / GOOGLE_CLOUD_PROJECT)
      if (!process.env.GCLOUD_PROJECT && svc.project_id) {
        process.env.GCLOUD_PROJECT = svc.project_id;
      }
      if (!process.env.GOOGLE_CLOUD_PROJECT && svc.project_id) {
        process.env.GOOGLE_CLOUD_PROJECT = svc.project_id;
      }
      if (process.env.NODE_ENV !== "production") {
        console.info(
          "[firebase-admin] Initialized with explicit service account for project:",
          svc.project_id
        );
      }
    } else {
      app = initializeApp({ credential: applicationDefault() } as any);
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[firebase-admin] Using applicationDefault credentials (no explicit service account env parsed)."
        );
      }
    }
  } catch (e) {
    console.error(
      "[firebase-admin] Initialization error; final fallback to applicationDefault()",
      (e as Error).message
    );
    app = initializeApp({ credential: applicationDefault() } as any);
  }
} else {
  app = getApps()[0];
}

// Development diagnostic: verify projectId resolution
if (process.env.NODE_ENV !== "production") {
  // Firestore has projectId on settings via private property
  const resolvedProject =
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.FIREBASE_CONFIG ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!resolvedProject) {
    console.warn(
      "[firebase-admin] No projectId detected from environment variables; ensure service account parsed correctly."
    );
  }
}

export const adminDb = getFirestore();
export const adminFieldValue = FieldValue;
export const adminAuth = getAuth();
export const adminStorage = getStorage();
export const adminMessaging = getMessaging();
