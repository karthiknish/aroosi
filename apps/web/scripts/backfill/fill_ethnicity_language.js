#!/usr/bin/env node
/**
 * Backfill missing fields: ethnicity, motherTongue, language on existing user docs.
 * Strategy:
 *  - For each user without the field (null/undefined/empty string), assign a default.
 *  - Defaults chosen to culturally neutral / common values; adjust as needed.
 *    ethnicity: 'Pashtun'
 *    motherTongue: 'Pashto'
 *    language: 'English'
 *  - Supports --dryRun to preview changes.
 *  - Batches writes (400 per batch) for efficiency & Firestore limits.
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let dryRun = false;
for (const a of process.argv.slice(2)) if (a === '--dryRun') dryRun = true;

const acctPath = path.resolve(__dirname, '../../firebase-service-account.json');
if (!fs.existsSync(acctPath)) { console.error('[fill-ethnicity-language] missing service account'); process.exit(1); }
const sa = require(acctPath);
try { admin.initializeApp({ credential: admin.credential.cert(sa) }); } catch {}
const db = admin.firestore();

const DEFAULTS = {
  ethnicity: 'Pashtun',
  motherTongue: 'Pashto',
  language: 'English',
};

function needsValue(v) { return v == null || (typeof v === 'string' && v.trim() === ''); }

(async function main() {
  const snap = await db.collection('users').get();
  const updates = [];
  snap.forEach(doc => {
    const d = doc.data();
    const patch = {};
    if (needsValue(d.ethnicity)) patch.ethnicity = DEFAULTS.ethnicity;
    if (needsValue(d.motherTongue)) patch.motherTongue = DEFAULTS.motherTongue;
    if (needsValue(d.language)) patch.language = DEFAULTS.language;
    if (Object.keys(patch).length) updates.push({ ref: doc.ref, patch });
  });

  console.log('[fill-ethnicity-language] total users', snap.size);
  console.log('[fill-ethnicity-language] users needing updates', updates.length);
  if (dryRun) {
    console.log('[fill-ethnicity-language] DRY RUN examples (first 5):');
    updates.slice(0,5).forEach(u => console.log(u.ref.id, u.patch));
    return;
  }

  let batch = db.batch();
  let count = 0;
  for (const u of updates) {
    batch.set(u.ref, u.patch, { merge: true });
    count++;
    if (count % 400 === 0) { await batch.commit(); batch = db.batch(); }
  }
  if (count % 400 !== 0) await batch.commit();
  console.log('[fill-ethnicity-language] updated documents', count);
})();
