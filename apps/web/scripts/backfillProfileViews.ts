#!/usr/bin/env ts-node
/**
 * Backfill totalProfileViews field on user documents by counting profileViews collection.
 * Usage (dev): npx ts-node scripts/backfillProfileViews.ts
 */
import { adminDb as db } from '../src/lib/firebaseAdminInit';

async function run() {
  const pvSnap = await db.collection('profileViews').get();
  const counts: Record<string, number> = {};
  pvSnap.docs.forEach(d => {
    const data = d.data() as any;
    const pid = data.profileId;
    if (!pid) return;
    counts[pid] = (counts[pid] || 0) + 1;
  });
  const batch = db.batch();
  let opCount = 0;
  for (const [userId, count] of Object.entries(counts)) {
    const ref = db.collection('users').doc(userId);
    batch.set(ref, { totalProfileViews: count }, { merge: true });
    opCount++;
    if (opCount >= 400) { // commit in chunks
      await batch.commit();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();
  console.log('Backfill complete for', Object.keys(counts).length, 'users');
}
run().catch(e => { console.error(e); process.exit(1); });
