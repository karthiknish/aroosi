# Firestore Composite Indexes (Post-Convex Migration)

Add these indexes in Firebase console (Firestore > Indexes > Composite) to support new query patterns.

## Usage Tracking
1. Collection: usageMonthly
   Fields (in order):
   - userId Asc
   - month Asc
   - feature Asc
   (No additional filters; collection group not required.)

2. Collection: usageTracking
   a) For monthly/daily filtering by user & timestamp: 
      - userId Asc
      - timestamp Desc (or Asc; choose Desc for recent-first ordering)
   b) For feature-specific time slices (optional if needed by analytics):
      - userId Asc
      - feature Asc
      - timestamp Desc

## Interests
Collection: interests
- fromUserId Asc
- toUserId Asc
(Enables deterministic document fetch by both user IDs. If also querying by toUserId alone, consider a single-field index or rely on built-in single field.)

## Notes
Collection: notes
- userId Asc
- toUserId Asc
(Used for unique upsert + fetch of private per-target note.)

## Matches (optional future optimizations)
If filtering by user1Id/user2Id in either order, consider symmetrical access pattern index(s):
- user1Id Asc, user2Id Asc (already covered by design use of where with in filters, though composite may still be beneficial).

## Quick Picks (if day filtering needed)
Collection: quickPicks
- userId Asc
- dayKey Asc
- rank Asc (optional for ordering top N)

## Message Receipts (optional)
Collection: messageReceipts
- messageId Asc
- userId Asc
(To quickly fetch receipt for a (message,user) pair if needed.)

## General Guidance
- Prefer descending timestamp for recency queries; adjust in queries accordingly.
- Avoid over-indexing rarely used patterns; add indexes on demand guided by Firestore error prompts.
- Keep index count lean to control write amplification and management overhead.

