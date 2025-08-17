// Centralized Firebase Admin initialization to avoid duplicate app inits.
import { getApps, initializeApp, cert, applicationDefault, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { getMessaging } from 'firebase-admin/messaging';

let app: App;

const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!getApps().length) {
  try {
    if (rawServiceAccount) {
      const svc = JSON.parse(rawServiceAccount);
      app = initializeApp({ credential: cert(svc) } as any);
    } else {
      app = initializeApp({ credential: applicationDefault() } as any);
    }
  } catch (e) {
    if (!getApps().length) {
      app = initializeApp({ credential: applicationDefault() } as any);
    } else {
      app = getApps()[0];
    }
  }
} else {
  app = getApps()[0];
}

export const adminDb = getFirestore();
export const adminFieldValue = FieldValue;
export const adminAuth = getAuth();
export const adminStorage = getStorage();
export const adminMessaging = getMessaging();
