import { DatabaseReader, DatabaseWriter } from "../_generated/server";

// Default rate limit: 5 requests per 60 seconds
const WINDOW_SIZE = 60 * 1000; // 60 seconds
const MAX_REQUESTS = 5;

export async function checkRateLimit(
  db: DatabaseReader | DatabaseWriter,
  key: string,
  windowSize: number = WINDOW_SIZE,
  maxRequests: number = MAX_REQUESTS
): Promise<{ allowed: boolean; retryAfter?: number }> {
  // Find the rate limit record for this key
  const record = await db
    .query("rateLimits")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  const now = Date.now();

  if (!record) {
    // No record: allow and create
    if ("insert" in db) {
      await db.insert("rateLimits", {
        key,
        windowStart: now,
        count: BigInt(1),
      });
    }
    return { allowed: true };
  }

  if (now - record.windowStart > windowSize) {
    // Window expired: reset
    if ("patch" in db) {
      await db.patch(record._id, {
        windowStart: now,
        count: BigInt(1),
      });
    }
    return { allowed: true };
  }

  if (record.count < BigInt(maxRequests)) {
    // Increment count
    if ("patch" in db) {
      await db.patch(record._id, {
        count: record.count + BigInt(1),
      });
    }
    return { allowed: true };
  }

  // Rate limit exceeded
  const retryAfter = record.windowStart + windowSize - now;
  return { allowed: false, retryAfter };
}
