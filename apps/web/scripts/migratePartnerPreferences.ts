#!/usr/bin/env npx ts-node --transpile-only
/**
 * Migration Script: Partner Preference Array Normalization
 * 
 * Converts string partner preference fields to single-element arrays.
 * 
 * Usage:
 *   cd apps/web && npx ts-node --transpile-only scripts/migratePartnerPreferences.ts [--dry-run] [--batch-size=100]
 * 
 * Options:
 *   --dry-run     Preview changes without writing to Firestore
 *   --batch-size  Number of documents to process per batch (default: 100)
 */

// Use require for CommonJS compatibility with ts-node
/* eslint-disable @typescript-eslint/no-var-requires */
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath) {
    const absolutePath = path.resolve(serviceAccountPath);
    const serviceAccount = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();

const ARRAY_FIELDS = [
  "preferredCities",
  "preferredReligions",
  "preferredEthnicities",
  "preferredLanguages",
  "preferredEducation",
  "preferredOccupations",
  "preferredMaritalStatuses",
];

/**
 * Converts a value to a string array
 */
function toStringArray(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : String(v).trim()))
      .filter((v) => v.length > 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed
      .split(/[,;\n]+/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }

  const str = String(value).trim();
  return str ? [str] : [];
}

interface MigrationStats {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
}

async function migratePartnerPreferences(options: {
  dryRun: boolean;
  batchSize: number;
}): Promise<MigrationStats> {
  const { dryRun, batchSize } = options;
  const stats: MigrationStats = { total: 0, updated: 0, skipped: 0, errors: 0 };

  console.log(`\n🚀 Starting Partner Preference Migration`);
  console.log(`   Mode: ${dryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`   Batch Size: ${batchSize}\n`);

  let lastDoc: any = null;

  while (true) {
    // Fetch batch
    let query = db.collection("users").limit(batchSize);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let batchUpdates = 0;

    for (const doc of snapshot.docs) {
      stats.total++;
      lastDoc = doc;

      try {
        const data = doc.data();
        const updates: Record<string, string[]> = {};

        for (const field of ARRAY_FIELDS) {
          const value = data[field];
          if (value === undefined || value === null) continue;

          // Skip if already an array
          if (Array.isArray(value)) continue;

          // Convert to array
          const normalized = toStringArray(value);
          if (normalized.length > 0 || typeof value === "string") {
            updates[field] = normalized;
          }
        }

        if (Object.keys(updates).length === 0) {
          stats.skipped++;
          continue;
        }

        if (dryRun) {
          console.log(`  [DRY RUN] Would update ${doc.id}:`, updates);
        } else {
          batch.update(doc.ref, updates);
          batchUpdates++;
        }
        stats.updated++;
      } catch (err) {
        console.error(`  ❌ Error processing ${doc.id}:`, err);
        stats.errors++;
      }
    }

    // Commit batch
    if (!dryRun && batchUpdates > 0) {
      await batch.commit();
      console.log(`  ✓ Committed batch of ${batchUpdates} updates`);
    }

    console.log(`  Progress: ${stats.total} processed, ${stats.updated} updated`);
  }

  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const batchSizeArg = args.find((a) => a.startsWith("--batch-size="));
  const batchSize = batchSizeArg ? parseInt(batchSizeArg.split("=")[1], 10) : 100;

  try {
    const stats = await migratePartnerPreferences({ dryRun, batchSize });

    console.log(`\n✅ Migration Complete`);
    console.log(`   Total Documents: ${stats.total}`);
    console.log(`   Updated: ${stats.updated}`);
    console.log(`   Skipped (already arrays): ${stats.skipped}`);
    console.log(`   Errors: ${stats.errors}`);

    if (dryRun) {
      console.log(`\n⚠️  This was a DRY RUN. No changes were made.`);
      console.log(`   Run without --dry-run to apply changes.\n`);
    }

    process.exit(stats.errors > 0 ? 1 : 0);
  } catch (err) {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  }
}

main();
