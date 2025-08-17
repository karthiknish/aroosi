#!/usr/bin/env ts-node
import { db } from '../../../src/lib/firebaseAdmin';
import { COL_TYPING_INDICATORS } from '../../../src/lib/firestoreSchema';

/**
 * Cleanup stale typing indicator documents.
 * Removes docs older than cutoffMs (default 60s) to keep collection small.
 * Intended to run every minute via external scheduler (Vercel cron, GitHub Action, etc.).
 */
async function cleanup(cutoffMs = 60_000) {
  const started = Date.now();
  const cutoff = Date.now() - cutoffMs;
  let deleted = 0;
  try {
    const snap = await db.collection(COL_TYPING_INDICATORS)
      .where('updatedAt','<', cutoff)
      .limit(500) // safety cap
      .get();
    if (snap.empty) {
      console.log('[typingIndicatorCleanup] No stale docs');
      return;
    }
    const batch = db.batch();
    snap.docs.forEach(d => { batch.delete(d.ref); deleted++; });
    await batch.commit();
    console.log(`[typingIndicatorCleanup] Deleted ${deleted} stale docs in ${Date.now()-started}ms`);
  } catch (e) {
    console.error('[typingIndicatorCleanup] Error', e);
    process.exitCode = 1;
  }
}

cleanup().catch(e => { console.error('Unhandled cleanup error', e); process.exit(1); });
