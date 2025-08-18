#!/usr/bin/env node
/**
 * Backfill writer: sync users/{uid}/images subcollection -> user doc profileImageIds/profileImageUrls
 * Adds answeredIcebreakersCount default (0) if missing when --fillAnswered flag passed.
 * Usage:
 *   node scripts/debug/backfill_profile_images_write.js --dryRun
 *   node scripts/debug/backfill_profile_images_write.js --batchSize=200 --concurrency=5 --fillAnswered
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let dryRun = false;
let batchSize = 200;
let concurrency = 5;
let fillAnswered = false;
for (const a of args) {
  if (a === '--dryRun') dryRun = true;
  else if (a.startsWith('--batchSize=')) batchSize = Math.min(500, parseInt(a.split('=')[1], 10) || batchSize);
  else if (a.startsWith('--concurrency=')) concurrency = Math.max(1, parseInt(a.split('=')[1], 10) || concurrency);
  else if (a === '--fillAnswered') fillAnswered = true;
}

const acctPath = path.resolve(__dirname, '../../firebase-service-account.json');
if (!fs.existsSync(acctPath)) {
  console.error('[backfill-write] Missing firebase-service-account.json');
  process.exit(1);
}
const serviceAccount = require(acctPath);
try { admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }); } catch {}
const db = admin.firestore();
const storage = admin.storage();

(async function main() {
  console.log('[backfill-write] Options', { dryRun, batchSize, concurrency, fillAnswered });
  const usersSnap = await db.collection('users').get();
  console.log('[backfill-write] Users fetched:', usersSnap.size);
  const queue = [...usersSnap.docs];
  let processed = 0;
  let updated = 0;
  let skippedNoImages = 0;
  let unchanged = 0;
  let batch = db.batch();
  let batchCount = 0;
  const start = Date.now();

  function progress() {
    process.stdout.write(`\rprocessed:${processed} updated:${updated} skippedNoImages:${skippedNoImages} unchanged:${unchanged}`);
  }

  async function handleDoc(doc) {
    const data = doc.data() || {};
    const imagesSnap = await doc.ref.collection('images').get();
    if (imagesSnap.empty) { skippedNoImages++; return; }
    const images = imagesSnap.docs.map(d => d.data()).filter(i => i && typeof i.storageId === 'string');
    if (!images.length) { skippedNoImages++; return; }

    // Derive bucket (fallback pattern)
    let bucketName = process.env.FIREBASE_STORAGE_BUCKET || serviceAccount.project_id + '.firebasestorage.app';

    const newIds = images.map(i => i.storageId);
    const newUrls = images.map(i => i.url || `https://storage.googleapis.com/${bucketName}/${i.storageId}`);

    const oldIds = Array.isArray(data.profileImageIds) ? data.profileImageIds : [];
    const oldUrls = Array.isArray(data.profileImageUrls) ? data.profileImageUrls : [];

    let needsUpdate = false;
    if (newIds.length !== oldIds.length) needsUpdate = true; else {
      for (let i = 0; i < newIds.length; i++) if (newIds[i] !== oldIds[i]) { needsUpdate = true; break; }
    }
    if (!needsUpdate) {
      if (newUrls.length !== oldUrls.length) needsUpdate = true; else {
        for (let i = 0; i < newUrls.length; i++) if (newUrls[i] !== oldUrls[i]) { needsUpdate = true; break; }
      }
    }

    const payload = {};
    if (needsUpdate) {
      payload.profileImageIds = newIds;
      payload.profileImageUrls = newUrls;
    }
    if (fillAnswered && typeof data.answeredIcebreakersCount !== 'number') {
      payload.answeredIcebreakersCount = 0;
      needsUpdate = true;
    }

    if (!needsUpdate) { unchanged++; return; }

    if (dryRun) {
      updated++;
      return;
    }
    batch.set(doc.ref, payload, { merge: true });
    batchCount++;
    updated++;
    if (batchCount >= batchSize) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  async function worker() {
    while (queue.length) {
      const d = queue.shift();
      if (!d) break;
      try { await handleDoc(d); } catch (e) { console.error('\n[backfill-write] Error doc', d.id, e.message || e); }
      processed++;
      if (processed % 20 === 0) progress();
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  if (!dryRun && batchCount > 0) await batch.commit();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  progress();
  process.stdout.write('\n');
  console.log('[backfill-write] Done', { updated, processed, skippedNoImages, unchanged, elapsed });
})();
