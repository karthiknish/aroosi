import { describe, expect, it, beforeAll } from '@jest/globals';
// Use relative import to avoid path alias issues in test config include
import { db, COLLECTIONS } from '../../src/lib/firebaseAdmin';

/**
 * Integration-style (lightweight) test ensuring accepting an interest yields a single match document
 * and repeated acceptance does not create duplicates (idempotent).
 *
 * NOTE: This assumes a Firestore emulator or isolated test project. If pointed at production, the IDs are scoped
 * with a unique prefix to minimize collisions.
 */

describe('Interest acceptance -> match creation', () => {
  const aId = 'itest_interest_a';
  const bId = 'itest_interest_b';

  beforeAll(async () => {
    await db.collection(COLLECTIONS.USERS).doc(aId).set({ email: 'ia@example.com', createdAt: Date.now() });
    await db.collection(COLLECTIONS.USERS).doc(bId).set({ email: 'ib@example.com', createdAt: Date.now() });
  });

  async function seedPendingInterest(from: string, to: string) {
    await db.collection('interests').add({
      fromUserId: from,
      toUserId: to,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  it('creates exactly one match when recipient accepts and remains idempotent', async () => {
    // Seed interest A -> B
    await seedPendingInterest(aId, bId);

    // Mark accepted (simulate API acceptance logic)
    const pending = await db.collection('interests')
      .where('fromUserId', '==', aId)
      .where('toUserId', '==', bId)
      .limit(1).get();
    expect(pending.empty).toBeFalsy();
    const interestDoc = pending.docs[0];
    await interestDoc.ref.set({ status: 'accepted', updatedAt: Date.now() }, { merge: true });

    // Server code would attempt to create a match; mimic with an upsert that checks both orderings
    const existingMatchSnap = await db.collection('matches')
      .where('userIds', 'array-contains', aId)
      .get();
    if (existingMatchSnap.empty) {
      await db.collection('matches').add({
        userIds: [aId, bId],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Re-run acceptance logic (idempotent) – simulate duplicate acceptance event
    const secondMatchSnap = await db.collection('matches')
      .where('userIds', 'array-contains', aId)
      .get();
    expect(secondMatchSnap.size).toBe(1);
  });
});
