import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// One-off backfill script to populate conversationId on existing messageReceipts docs.
// Usage (node): ts-node ./scripts/one-off/backfillMessageReceiptsConversationId.ts
// Assumes GOOGLE_APPLICATION_CREDENTIALS env or service account JSON inline below.

// If not already initialized by other bootstrap code.
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Optionally load local service account JSON path.
  // console.warn('GOOGLE_APPLICATION_CREDENTIALS not set; ensure credentials are provided.');
}
try {
  initializeApp();
} catch {
  // already initialized
}

const db = getFirestore();

// Heuristic: derive conversationId from messageId prefix before first '_' + second part, or full sorted pair.
// Adjust logic to match actual messageId structure in production if different.
function deriveConversationId(messageId: string): string | null {
  // Example formats to support:
  // conversationId_timestamp_random -> conversationId is substring up to first '_'
  // userA_userB_timestamp_random -> conversation participants pair forms conversationId (userA_userB)
  if (!messageId) return null;
  const parts = messageId.split('_');
  if (parts.length < 2) return null;
  // If first two parts look like user ids (length > 10) treat first two as conversation pair
  if (parts.length >= 3 && parts[0].length > 10 && parts[1].length > 10) {
    return `${parts[0]}_${parts[1]}`;
  }
  // Otherwise assume first part already is conversationId
  return parts[0];
}

async function run(batchSize = 300) {
  console.log('Starting backfill of conversationId on messageReceipts');
  const col = db.collection('messageReceipts');
  const snapshot = await col.get();
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let batch = db.batch();
  for (const doc of snapshot.docs) {
    processed++;
    const data = doc.data();
    if (data.conversationId) { skipped++; continue; }
    const messageId: string = data.messageId;
    const convId = deriveConversationId(messageId);
    if (!convId) { skipped++; continue; }
    batch.update(doc.ref, { conversationId: convId });
    updated++;
    if (updated % batchSize === 0) {
      await batch.commit();
      console.log(`Committed batch at updated=${updated}`);
      batch = db.batch();
    }
  }
  if ((updated % batchSize) !== 0) {
    await batch.commit();
  }
  console.log('Backfill complete', { processed, updated, skipped, failed });
}

run().catch(err => {
  console.error('Backfill failed', err);
  process.exit(1);
});
