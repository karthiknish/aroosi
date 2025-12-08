#!/usr/bin/env node
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const acctPath = path.resolve(__dirname, '../../firebase-service-account.json');
if (!fs.existsSync(acctPath)) {
  console.error('[dryrun-backfill] firebase-service-account.json not found at', acctPath);
  process.exit(1);
}
const serviceAccount = require(acctPath);

try {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {}
const db = admin.firestore();
const storage = admin.storage();

(async function main() {
  try {
    console.log('[dryrun-backfill] Fetching users...');
    const usersSnap = await db.collection('users').get();
    const total = usersSnap.size;
    console.log(`[dryrun-backfill] found ${total} users`);

    let processed = 0;
    let wouldUpdate = 0;
    const samples = [];
    // Derive bucket name from env or service account projectId
    let bucketName = process.env.FIREBASE_STORAGE_BUCKET || null;
    if (!bucketName) {
      try {
        const sa = require(path.resolve(__dirname, '../../firebase-service-account.json'));
        if (sa && sa.project_id) bucketName = `${sa.project_id}.firebasestorage.app`;
      } catch (e) {
        // ignore
      }
    }
    if (!bucketName) bucketName = 'undefined-bucket';

    for (const doc of usersSnap.docs) {
      processed++;
      const data = doc.data() || {};
      // read images subcollection
      let images = [];
      try {
        const imagesSnap = await doc.ref.collection('images').get();
        images = imagesSnap.docs.map(d => d.data()).filter(Boolean);
      } catch (e) {
        console.warn('[dryrun-backfill] failed reading images for', doc.id, e.message || e);
      }

      const storageIds = images.filter(i => typeof i.storageId === 'string').map(i => i.storageId);
      const urls = images.map(i => i.url || (i.storageId ? `https://storage.googleapis.com/${bucketName}/${i.storageId}` : null)).filter(Boolean);

      const existingIds = Array.isArray(data.profileImageIds) ? data.profileImageIds : (data.profileImageIds ? [data.profileImageIds] : []);
      const existingUrls = Array.isArray(data.profileImageUrls) ? data.profileImageUrls : (data.profileImageUrls ? [data.profileImageUrls] : []);

      let needsUpdate = false;
      if (storageIds.length !== existingIds.length) needsUpdate = true;
      else {
        for (let i = 0; i < storageIds.length; i++) {
          if (existingIds[i] !== storageIds[i]) { needsUpdate = true; break; }
        }
      }
      if (!needsUpdate) {
        if (urls.length !== existingUrls.length) needsUpdate = true;
        else {
          for (let i = 0; i < urls.length; i++) {
            if (existingUrls[i] !== urls[i]) { needsUpdate = true; break; }
          }
        }
      }

      if (needsUpdate) {
        wouldUpdate++;
        if (samples.length < 12) {
          samples.push({
            id: doc.id,
            existingIds: existingIds || null,
            newIds: storageIds,
            existingUrls: existingUrls || null,
            newUrls: urls,
          });
        }
      }

      if (processed % 100 === 0) {
        process.stdout.write(`processed ${processed}/${total}...\r`);
      }
    }

    console.log('\n[dryrun-backfill] complete');
    console.log(JSON.stringify({ total, wouldUpdate, samples }, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('[dryrun-backfill] error', e.message || e);
    process.exit(2);
  }
})();
