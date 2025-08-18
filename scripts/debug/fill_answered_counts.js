#!/usr/bin/env node
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let dryRun = false;
for (const a of process.argv.slice(2)) if (a === '--dryRun') dryRun = true;

const acctPath = path.resolve(__dirname, '../../firebase-service-account.json');
if (!fs.existsSync(acctPath)) { console.error('[fill-answered] missing service account'); process.exit(1); }
const sa = require(acctPath);
try { admin.initializeApp({ credential: admin.credential.cert(sa) }); } catch {}
const db = admin.firestore();

(async function main() {
  const snap = await db.collection('users').get();
  let toUpdate = [];
  snap.forEach(doc => {
    const d = doc.data();
    if (typeof d.answeredIcebreakersCount !== 'number') {
      toUpdate.push(doc.ref);
    }
  });
  console.log('[fill-answered] total users', snap.size, 'missing answered', toUpdate.length);
  if (dryRun) return;
  let batch = db.batch();
  let count = 0;
  for (const ref of toUpdate) {
    batch.set(ref, { answeredIcebreakersCount: 0 }, { merge: true });
    count++;
    if (count % 400 === 0) { await batch.commit(); batch = db.batch(); }
  }
  if (count % 400 !== 0) await batch.commit();
  console.log('[fill-answered] updated', count);
})();
