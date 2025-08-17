#!/usr/bin/env ts-node
/**
 * Backfill script: Sync users/{uid}/images subcollection into main user doc
 * profileImageIds + profileImageUrls arrays if missing or out of sync.
 *
 * Features added:
 *  - Chunked batch writes (configurable, default 200, max 500)
 *  - Simple progress bar with live updated counters & ETA
 *  - Concurrency control for reading image subcollections
 *  - Dry run mode (no writes) for verification
 *
 * Usage examples:
 *  npx ts-node scripts/backfill/backfillProfileImageUrls.ts
 *  npx ts-node scripts/backfill/backfillProfileImageUrls.ts --batchSize=300 --concurrency=10
 *  npx ts-node scripts/backfill/backfillProfileImageUrls.ts --dryRun
 *  npx ts-node scripts/backfill/backfillProfileImageUrls.ts --no-batch
 */
import { adminDb, adminStorage } from '../../src/lib/firebaseAdminInit';

interface CliOptions {
  batchSize: number; // writes per Firestore batch (<=500)
  concurrency: number; // parallel document processing (reads)
  dryRun: boolean;
  useBatch: boolean;
  verbose: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {
    batchSize: 200,
    concurrency: 5,
    dryRun: false,
    useBatch: true,
    verbose: false,
  };
  for (const a of args) {
    if (a.startsWith('--batchSize=')) opts.batchSize = Math.min(500, parseInt(a.split('=')[1], 10) || opts.batchSize);
    else if (a.startsWith('--concurrency=')) opts.concurrency = Math.max(1, parseInt(a.split('=')[1], 10) || opts.concurrency);
    else if (a === '--dryRun') opts.dryRun = true;
    else if (a === '--no-batch') opts.useBatch = false;
    else if (a === '--verbose') opts.verbose = true;
  }
  if (!opts.useBatch) {
    // When disabled treat each write independently
    opts.batchSize = 1;
  }
  return opts;
}

function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms < 0) return '?:??';
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function renderProgress(processed: number, total: number, updated: number, start: number) {
  const width = 30;
  const pct = total ? processed / total : 0;
  const filled = Math.round(pct * width);
  const bar = `[${'#'.repeat(filled)}${'-'.repeat(width - filled)}]`;
  const elapsed = Date.now() - start;
  const rate = processed ? elapsed / processed : 0;
  const remaining = total - processed;
  const eta = rate * remaining;
  const line = `${bar} ${(pct * 100).toFixed(1).padStart(6, ' ')}%  docs:${processed}/${total}  updated:${updated}  ETA:${formatDuration(eta)}  Elapsed:${formatDuration(elapsed)}`;
  process.stdout.write('\r' + line);
  if (processed === total) process.stdout.write('\n');
}

async function processDoc(doc: FirebaseFirestore.QueryDocumentSnapshot, bucketName: string) {
  const data = doc.data() as any;
  const imagesCol = doc.ref.collection('images');
  const imagesSnap = await imagesCol.get();
  if (imagesSnap.empty) return { needsUpdate: false };
  const images = imagesSnap.docs
    .map(d => d.data() as any)
    .filter(img => img && typeof img.storageId === 'string');
  if (!images.length) return { needsUpdate: false };

  const storageIds = images.map(i => i.storageId);
  const urls = images.map(i => i.url || `https://storage.googleapis.com/${bucketName}/${i.storageId}`);

  const existingIds: string[] = Array.isArray(data.profileImageIds) ? data.profileImageIds : [];
  const existingUrls: string[] = Array.isArray(data.profileImageUrls) ? data.profileImageUrls : [];

  let needsUpdate = false;
  if (storageIds.length !== existingIds.length || storageIds.some((id, i) => existingIds[i] !== id)) {
    needsUpdate = true;
  } else if (urls.some((u, i) => existingUrls[i] !== u)) {
    needsUpdate = true;
  }
  if (!needsUpdate) return { needsUpdate: false };
  const payload = { profileImageIds: storageIds, profileImageUrls: urls, updatedAt: Date.now() };
  return { needsUpdate: true, payload };
}

async function run() {
  const opts = parseArgs();
  console.log('Starting backfill (images -> user doc arrays) with options:', opts);
  const usersCol = adminDb.collection('users');
  const snap = await usersCol.get();
  const total = snap.size;
  console.log(`Fetched ${total} user documents.`);
  const bucketName = adminStorage.bucket().name;

  let updated = 0;
  let processed = 0;
  const start = Date.now();

  // Batch state
  let batch = adminDb.batch();
  let batchCount = 0;

  const queue = [...snap.docs];

  async function worker() {
    while (queue.length) {
      const doc = queue.shift();
      if (!doc) break;
      try {
        const result = await processDoc(doc, bucketName);
        if (result.needsUpdate && result.payload) {
          if (opts.dryRun) {
            if (opts.verbose) console.log(`(dryRun) Would update user ${doc.id}`);
          } else if (opts.useBatch) {
            batch.set(doc.ref, result.payload, { merge: true });
            batchCount++;
            if (batchCount >= opts.batchSize) {
              await batch.commit();
              batch = adminDb.batch();
              batchCount = 0;
            }
          } else {
            await doc.ref.set(result.payload, { merge: true });
          }
          updated++;
        }
      } catch (e) {
        console.error(`Error processing user ${doc.id}:`, (e as any)?.message || e);
      }
      processed++;
      renderProgress(processed, total, updated, start);
    }
  }

  // Launch workers
  const workers = Array.from({ length: opts.concurrency }, () => worker());
  await Promise.all(workers);

  // Final batch commit if needed
  if (!opts.dryRun && opts.useBatch && batchCount > 0) {
    await batch.commit();
  }

  const elapsed = Date.now() - start;
  console.log(`Backfill complete. Updated ${updated} user documents in ${formatDuration(elapsed)} (${(elapsed / 1000).toFixed(1)}s). DryRun=${opts.dryRun}`);
}

run().catch(err => {
  console.error('Backfill failed', err);
  process.exit(1);
});
