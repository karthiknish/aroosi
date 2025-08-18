#!/usr/bin/env ts-node
/**
 * Backfill script: ensure every user with profileImageIds has matching profileImageUrls entries.
 * Also repairs malformed hostnames by regenerating canonical GCS URL using the admin bucket name.
 *
 * Usage (ts-node or ts-node-register): npx ts-node scripts/backfillProfileImageUrls.ts
 */
// Using relative path because TS path aliases may not be configured for standalone ts-node run.
import { adminStorage, db } from "../src/lib/firebaseAdmin";

async function run() {
  const bucketName = adminStorage.bucket().name;
  const usersSnap = await db.collection("users").get();
  let updated = 0;
  for (const doc of usersSnap.docs) {
    const data = doc.data() as any;
    const ids: string[] = Array.isArray(data.profileImageIds) ? data.profileImageIds : [];
    const urls: string[] = Array.isArray(data.profileImageUrls) ? data.profileImageUrls : [];
    if (ids.length === 0) continue;
    let changed = false;
    const nextUrls = [...urls];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      if (!id || typeof id !== "string") continue;
      // Canonical URL
      const canonical = `https://storage.googleapis.com/${bucketName}/${id}`;
      if (!nextUrls[i]) {
        nextUrls[i] = canonical;
        changed = true;
      } else if (!nextUrls[i].startsWith(`https://storage.googleapis.com/`)) {
        // Malformed host fix
        nextUrls[i] = canonical;
        changed = true;
      }
    }
    if (changed) {
      await doc.ref.set({ profileImageUrls: nextUrls, updatedAt: Date.now() }, { merge: true });
      updated++;
      // eslint-disable-next-line no-console
      console.log(`[backfill] Repaired user ${doc.id}`);
    }
  }
  // eslint-disable-next-line no-console
  console.log(`[backfill] Completed. Users updated: ${updated}`);
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("Backfill failed", e);
  process.exit(1);
});
