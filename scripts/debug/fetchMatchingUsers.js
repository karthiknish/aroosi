#!/usr/bin/env node
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const argv = require('process').argv.slice(2);
const parsed = {
  limit: 20,
  preferredGender: null,
  userId: null,
  includeAnswered: false,
};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--limit=')) parsed.limit = Number(a.split('=')[1]) || 20;
  if (a.startsWith('--preferredGender=')) parsed.preferredGender = a.split('=')[1] || null;
  if (a.startsWith('--userId=')) parsed.userId = a.split('=')[1] || null;
  if (a === '--includeAnswered') parsed.includeAnswered = true;
}

const acctPath = path.resolve(__dirname, '../../firebase-service-account.json');
if (!fs.existsSync(acctPath)) {
  console.error('[fetchMatchingUsers] firebase-service-account.json not found at', acctPath);
  process.exit(1);
}

const serviceAccount = require(acctPath);

try {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (e) {
  // ignore re-init in long-running dev envs
}

const db = admin.firestore();

(async function main() {
  try {
    const results = [];

  if (parsed.userId) {
      console.log('[fetchMatchingUsers] Fetching single user by id', parsed.userId);
      const doc = await db.collection('users').doc(parsed.userId).get();
      if (!doc.exists) {
        console.log('[fetchMatchingUsers] Document not found for id', parsed.userId);
      } else {
        const d = doc.data();
        results.push({
          id: doc.id,
          answeredIcebreakersCount: d.answeredIcebreakersCount ?? null,
          createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : null,
          banned: !!d.banned,
          hiddenFromSearch: !!d.hiddenFromSearch,
          profileImageIds: Array.isArray(d.profileImageIds) ? d.profileImageIds : d.profileImageIds ? [d.profileImageIds] : [],
          profileImageUrls: Array.isArray(d.profileImageUrls) ? d.profileImageUrls : d.profileImageUrls ? [d.profileImageUrls] : [],
          displayName: d.displayName || d.name || null,
          age: d.age ?? null,
          city: d.city || null,
          country: d.country || null,
        });
      }
    } else {
      // Use a simple query (no composite ordering) so this can run without a composite index.
      // We'll fetch recent users that match onboarding + preferredGender if provided.
      let q = db.collection('users').where('isOnboardingComplete', '==', true);
      if (parsed.preferredGender) q = q.where('preferredGender', '==', parsed.preferredGender);

      // Optionally include ordering by answeredIcebreakersCount to reproduce search route
      try {
        if (parsed.includeAnswered) {
          q = q.orderBy('answeredIcebreakersCount', 'desc').orderBy('createdAt', 'desc').orderBy('id', 'desc').limit(parsed.limit);
        } else {
          q = q.limit(parsed.limit);
        }
      } catch (e) {
        console.warn('[fetchMatchingUsers] Ordering construction warning:', e.message || e);
      }

      console.log('[fetchMatchingUsers] Running query with', { limit: parsed.limit, preferredGender: parsed.preferredGender, includeAnswered: parsed.includeAnswered });
      let snap;
      try {
        snap = await q.get();
      } catch (e) {
        console.error('[fetchMatchingUsers] Query failed (likely index missing):', e.message || e);
        throw e;
      }
      console.log('[fetchMatchingUsers] Query snapshot size =', snap.size);

      snap.forEach(doc => {
        const d = doc.data();
        results.push({
          id: doc.id,
          answeredIcebreakersCount: d.answeredIcebreakersCount ?? null,
          createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : null,
          banned: !!d.banned,
          hiddenFromSearch: !!d.hiddenFromSearch,
          profileImageIds: Array.isArray(d.profileImageIds) ? d.profileImageIds : d.profileImageIds ? [d.profileImageIds] : [],
          profileImageUrls: Array.isArray(d.profileImageUrls) ? d.profileImageUrls : d.profileImageUrls ? [d.profileImageUrls] : [],
          displayName: d.displayName || d.name || null,
          age: d.age ?? null,
          city: d.city || null,
          country: d.country || null,
        });
      });
    }

    console.log(JSON.stringify({ count: results.length, results }, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('[fetchMatchingUsers] Error running query:', (e && e.message) || e);
    process.exit(2);
  }
})();
