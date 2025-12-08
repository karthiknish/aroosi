#!/usr/bin/env node
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const acctPath = path.resolve(__dirname, '../../firebase-service-account.json');
if (!fs.existsSync(acctPath)) {
  console.error('[count_missing_fields] firebase-service-account.json not found at', acctPath);
  process.exit(1);
}
const serviceAccount = require(acctPath);

try {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {}
const db = admin.firestore();

(async function main() {
  try {
    const snap = await db.collection('users').get();
    let total = snap.size;
    let missingAnswered = 0;
    let missingImageUrls = 0;
    let missingProfileImageIds = 0;
    let sampleIds = [];
    snap.forEach(doc => {
      const d = doc.data();
      const hasAnswered = typeof d.answeredIcebreakersCount === 'number';
      const hasUrls = Array.isArray(d.profileImageUrls) && d.profileImageUrls.length > 0;
      const hasIds = Array.isArray(d.profileImageIds) && d.profileImageIds.length > 0;
      if (!hasAnswered) missingAnswered++;
      if (!hasUrls) missingImageUrls++;
      if (!hasIds) missingProfileImageIds++;
      if (sampleIds.length < 5 && (!hasAnswered || !hasUrls)) sampleIds.push({ id: doc.id, answered: d.answeredIcebreakersCount ?? null, profileImageUrls: d.profileImageUrls ?? null, profileImageIds: d.profileImageIds ?? null });
    });
    console.log(JSON.stringify({ total, missingAnswered, missingImageUrls, missingProfileImageIds, samples: sampleIds }, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('[count_missing_fields] Error', e.message || e);
    process.exit(2);
  }
})();
