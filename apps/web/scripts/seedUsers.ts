#!/usr/bin/env ts-node
/**
 * Seed demo user profiles with optional image upload.
 *
 * Usage:
 *   npx ts-node scripts/seedUsers.ts --count 20 --upload-images
 *   npx ts-node scripts/seedUsers.ts --male 10 --female 10
 *
 * Env requirements:
 *   FIREBASE_SERVICE_ACCOUNT (single-line JSON or base64) or FIREBASE_SERVICE_ACCOUNT_BASE64
 *   (Optionally) FIREBASE_STORAGE_BUCKET if different from default
 */
import path from 'path';
import fs from 'fs';
import { faker } from '@faker-js/faker';
// Explicit dotenv loading so .env.local (Next.js style) is honored for this standalone script.
import dotenv from 'dotenv';
try {
  const localPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(localPath)) {
    dotenv.config({ path: localPath });
  }
  // Fallback to generic .env if present
  dotenv.config();
} catch {}
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let adminDb: FirebaseFirestore.Firestore; let adminStorage: ReturnType<typeof getStorage>;

function initAdmin(explicitProject?: string, explicitBucket?: string) {
  if (adminDb) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  // Path-based credential loading deprecated; FIREBASE_SERVICE_ACCOUNT_PATH ignored
  let svc: any = null;
  const tryParse = (s?: string|null) => { if (!s) return null; const t = s.trim(); if (!t) return null; try { return JSON.parse(t); } catch { return null; } };
  if (raw) svc = tryParse(raw) || null;
  if (!svc && b64) { try { const dec = Buffer.from(b64, 'base64').toString('utf8'); svc = JSON.parse(dec); } catch {} }
  // Legacy path variant intentionally removed to avoid filesystem secret leaks
  if (!getApps().length) {
    try {
      let projectId = explicitProject || svc?.project_id || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      // Fallback: try reading .firebaserc if present
      if (!projectId) {
        try {
          const rcPath = path.join(process.cwd(), '.firebaserc');
          if (fs.existsSync(rcPath)) {
            const rc = JSON.parse(fs.readFileSync(rcPath,'utf8'));
            projectId = rc.projects?.default || projectId;
          }
        } catch {}
      }
      if (!projectId && !svc) {
        console.error('[seed] Missing projectId. Fix by one of:');
        console.error('  1) Pass --project <id>');
        console.error('  2) Set env NEXT_PUBLIC_FIREBASE_PROJECT_ID or GCLOUD_PROJECT');
        console.error('  3) Provide service account (FIREBASE_SERVICE_ACCOUNT or FIREBASE_SERVICE_ACCOUNT_BASE64) containing project_id');
        console.error('  4) Create .firebaserc with { "projects": { "default": "<id>" } }');
        process.exit(1);
      }
      const svcSource = svc ? (raw ? 'raw' : (b64 ? 'base64' : 'unknown')) : 'applicationDefault';
      console.log('[seed] Init context', { projectId, hasSvc: !!svc, svcSource, explicitBucket, envBucket: process.env.FIREBASE_STORAGE_BUCKET });
      const storageBucket = explicitBucket || process.env.FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.appspot.com` : undefined);
      if (svc) {
        initializeApp({ credential: cert(svc as any), projectId: projectId || svc.project_id, storageBucket });
      } else {
        console.error('[seed] No service account credentials found. Set FIREBASE_SERVICE_ACCOUNT (single-line JSON) or FIREBASE_SERVICE_ACCOUNT_BASE64. Application Default Credentials were attempted previously and failed.');
        process.exit(1);
      }
    } catch (e) {
      console.error('[seed] Failed to initialize firebase-admin', (e as Error).message);
      throw e;
    }
  }
  adminDb = getFirestore();
  adminStorage = getStorage();
  // Path variant removed – no post-init filesystem check
}

interface SeedOptions { male: number; female: number; uploadImages: boolean; projectId?: string; bucket?: string; }

function parseArgs(): SeedOptions {
  const args = process.argv.slice(2);
  let male = 0, female = 0, count: number | null = null; let uploadImages = false; let projectId: string | undefined; let bucket: string | undefined;
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--count') { count = parseInt(args[++i]||'0',10); }
    else if (a === '--male') male = parseInt(args[++i]||'0',10);
    else if (a === '--female') female = parseInt(args[++i]||'0',10);
    else if (a === '--upload-images') uploadImages = true;
    else if (a === '--project') projectId = args[++i];
    else if (a === '--bucket') bucket = args[++i];
  }
  if (count != null && (male === 0 && female === 0)) {
    male = Math.floor(count/2); female = count - male;
  }
  return { male, female, uploadImages, projectId, bucket };
}

const MALE_FOLDER = path.join(process.cwd(), 'seed_images', 'male');
const FEMALE_FOLDER = path.join(process.cwd(), 'seed_images', 'female');

function ensureFolders() { [MALE_FOLDER, FEMALE_FOLDER].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }); }

const religions = ['Islam','Hinduism','Christianity','Sikhism','Buddhism'];
const educations = ['Bachelors','Masters','PhD','High School','Diploma'];
const occupations = ['Engineer','Designer','Teacher','Doctor','Entrepreneur','Analyst'];
const maritalStatuses = ['never_married','divorced'];
const languages = ['English','Arabic','Hindi','Urdu','Bengali'];

function randomDateOfBirth(minAge=21, maxAge=45): string {
  const now = new Date();
  const age = Math.floor(Math.random()*(maxAge-minAge+1))+minAge;
  const year = now.getFullYear() - age;
  const month = Math.floor(Math.random()*12)+1;
  const day = Math.floor(Math.random()*28)+1;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

async function maybeUploadImage(localPath: string, dest: string): Promise<string|null> {
  try {
    if (!fs.existsSync(localPath)) return null;
    const bucket = adminStorage.bucket();
    await bucket.upload(localPath, { destination: dest, metadata: { cacheControl: 'public,max-age=31536000' }});
    const [url] = await bucket.file(dest).getSignedUrl({ action:'read', expires: Date.now()+ 1000*60*60*24*30 });
    return url;
  } catch (e) { console.warn('Image upload failed', localPath, (e as Error).message); return null; }
}

async function seedGender(gender: 'male'|'female', count: number, uploadImages: boolean) {
  const folder = gender === 'male' ? MALE_FOLDER : FEMALE_FOLDER;
  const imageFiles = uploadImages ? fs.readdirSync(folder).filter(f=>!f.startsWith('.')) : [];
  for (let i=0;i<count;i++) {
    const fullName = faker.person.fullName({sex: gender === 'male' ? 'male':'female'});
    const email = faker.internet.email({ firstName: fullName.split(' ')[0], lastName: fullName.split(' ').slice(1).join('') }).toLowerCase();
    const userRef = adminDb.collection('users').doc();
    const profileCompletionPercentage = 100;
    const profileImageUrls: string[] = [];
    if (uploadImages && imageFiles.length) {
      const pick = imageFiles[i % imageFiles.length];
      const localPath = path.join(folder, pick);
      const dest = `profileImages/${userRef.id}/${pick}`;
      const url = await maybeUploadImage(localPath, dest);
      if (url) profileImageUrls.push(url);
    }
    await userRef.set({
      email,
      fullName,
      gender,
      dateOfBirth: randomDateOfBirth(),
      city: faker.location.city(),
      country: faker.location.country(),
      religion: faker.helpers.arrayElement(religions),
      education: faker.helpers.arrayElement(educations),
      occupation: faker.helpers.arrayElement(occupations),
      maritalStatus: faker.helpers.arrayElement(maritalStatuses),
      language: faker.helpers.arrayElement(languages),
      aboutMe: faker.lorem.sentences({ min: 2, max: 4 }),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      profileCompletionPercentage,
      subscriptionPlan: "free",
      profileImageUrls,
      age: faker.number.int({ min: 21, max: 45 }),
      boostedUntil: null,
      hiddenFromSearch: false,
    });
    console.log(`[seed] Created ${gender} profile ${i+1}/${count}`);
  }
}

async function main() {
  const { male, female, uploadImages, projectId, bucket } = parseArgs();
  initAdmin(projectId, bucket);
  if (male+female === 0) { console.error('Specify --count N or --male X --female Y'); process.exit(1);}  
  ensureFolders();
  console.log('Seeding users', { male, female, uploadImages, projectId: projectId || 'auto', bucket: bucket || process.env.FIREBASE_STORAGE_BUCKET });
  await seedGender('male', male, uploadImages);
  await seedGender('female', female, uploadImages);
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
