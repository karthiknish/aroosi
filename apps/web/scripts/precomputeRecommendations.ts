/**
 * Precompute Recommendations Batch Script
 * ---------------------------------------
 * Iterates active users and materializes a cached recommendation payload
 * ahead of time to reduce on-demand latency. Intended to run via cron.
 *
 * Usage (ts-node): npx ts-node scripts/precomputeRecommendations.ts --limit=500
 */
import { db } from "../src/lib/firebaseAdmin";
import { buildRecommendationItem, COL_RECOMMENDATIONS } from "../src/lib/firestoreSchema";

// Basic heuristic replicate: fetch latest profiles excluding self; simple score based on recency + premium boost
async function computeForUser(userId: string) {
  const profileSnap = await db.collection('users').doc(userId).get();
  if (!profileSnap.exists) return;
  const me = profileSnap.data() as any;
  if (me?.banned) return;

  const overFetch = 150;
  const usersSnap = await db.collection('users').orderBy('createdAt', 'desc').limit(overFetch).get();
  const candidates = usersSnap.docs.filter(d => d.id !== userId).map(d => ({ id: d.id, ...(d.data() as any) }));
  const scored = candidates.map(c => {
    let score = 0;
    if (me.city && c.city === me.city) score += 5;
    if (c.subscriptionPlan === 'premiumPlus' || c.subscriptionPlan === 'premium_plus') score += 15; else if (c.subscriptionPlan === 'premium') score += 8;
    if (Array.isArray(me.interests) && Array.isArray(c.interests)) {
      const overlap = c.interests.filter((i: string) => me.interests.includes(i)).length;
      score += Math.min(overlap * 2, 40);
    }
    return { id: c.id, score, createdAt: c.createdAt || 0, city: c.city };
  }).sort((a,b)=> b.score - a.score || b.createdAt - a.createdAt);
  const diversity: typeof scored = [];
  for (const cand of scored) {
    const n = diversity.length;
    if (n >= 2 && diversity[n-1].city === diversity[n-2].city && diversity[n-1].city === cand.city) {
      const alt = scored.find(x => x.city !== cand.city);
      if (alt) continue; // skip to avoid long run
    }
    diversity.push(cand);
    if (diversity.length >= 100) break;
  }
  const payload = diversity.slice(0,100);
  if (!payload.length) return;
  const rec = buildRecommendationItem(userId, payload[0].id, payload[0].score, 'heuristic_v1', ['batch'], 5*60*1000);
  await db.collection(COL_RECOMMENDATIONS).add({ ...rec, payload, diversity: 'city' });
}

async function main() {
  const arg = process.argv.find(a=> a.startsWith('--limit='));
  const limit = arg ? parseInt(arg.split('=')[1],10) : 500;
  const usersSnap = await db.collection('users').orderBy('createdAt','desc').limit(limit).get();
  let processed = 0;
  for (const doc of usersSnap.docs) {
    try { await computeForUser(doc.id); processed++; if (processed % 25 === 0) console.log('Processed', processed); } catch(e) { console.warn('User compute failed', doc.id, (e as Error).message); }
  }
  console.log('Done. Total processed', processed);
  process.exit(0);
}

main().catch(e=> { console.error(e); process.exit(1); });
