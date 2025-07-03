#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { api } from "../../convex/_generated/api";

// --- Config & ENV -------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..", "..");
const envPath = path.join(rootDir, ".env.local");
dotenv.config({ path: envPath });

const SOURCE_URL = "https://quirky-akita-969.convex.cloud";
const DEST_URL = "https://proper-gull-501.convex.cloud";

// Tokens optional because we removed server-side auth checks.
const SOURCE_TOKEN = process.env.SOURCE_CONVEX_TOKEN;
const DEST_TOKEN = process.env.DEST_CONVEX_TOKEN;

// ------------------------------------------------------------
const sourceClient = new ConvexHttpClient(SOURCE_URL);
// if (SOURCE_TOKEN) sourceClient.setAuth(SOURCE_TOKEN);

const destClient = new ConvexHttpClient(DEST_URL);
// if (DEST_TOKEN) destClient.setAuth(DEST_TOKEN);

// Helpers -----------------------------------------------------
interface User { _id: string; clerkId: string; }
interface Profile { _id: string; clerkId: string; userId: string; profileImageIds?: string[]; }
interface ImageRecord {
  _id: string;
  _creationTime: number;
  userId: string;
  storageId: string;
  fileName: string;
  contentType?: string;
  fileSize?: number;
}

async function buildMaps() {
  const [srcUsers, dstUsers, srcProfiles, dstProfiles] = await Promise.all([
    sourceClient.query(api.migration.getAllUsers),
    destClient.query(api.migration.getAllUsers),
    sourceClient.query(api.migration.getAllProfiles),
    destClient.query(api.migration.getAllProfiles),
  ]);

  const userMap = new Map<string, string>(); // oldId -> newId
  const clerkToDestUserId = new Map<string, string>();
  (dstUsers as any as User[]).forEach((u) => clerkToDestUserId.set(u.clerkId, u._id));
  (srcUsers as any as User[]).forEach((u) => {
    const destId = clerkToDestUserId.get(u.clerkId);
    if (destId) userMap.set(u._id, destId);
  });

  const profileMap = new Map<string, string>(); // oldId -> newId
  const clerkToDestProfileId = new Map<string, string>();
  (dstProfiles as any as Profile[]).forEach((p) => clerkToDestProfileId.set(p.clerkId, p._id));
  (srcProfiles as any as Profile[]).forEach((p) => {
    const destId = clerkToDestProfileId.get(p.clerkId);
    if (destId) profileMap.set(p._id, destId);
  });

  return { userMap, profileMap };
}

async function migrateImages() {
  console.log("Fetching mappings...");
  const { userMap, profileMap } = await buildMaps();

  console.log("Fetching source images...");
  const sourceImages = (await sourceClient.query(api.migration.getAllImages)) as any as ImageRecord[];
  console.log(`Found ${sourceImages.length} images`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const img of sourceImages) {
    const destUserId = userMap.get(img.userId);
    if (!destUserId) {
      skipped++;
      continue;
    }

    try {
      // 1. Download blob
      const blobResp = await fetch(`${SOURCE_URL}/api/storage/${img.storageId}`);
      if (!blobResp.ok) throw new Error(`Failed to fetch blob ${img.storageId}`);
      const arrayBuf = await blobResp.arrayBuffer();

      // 2. Get upload URL from destination
      const generateRes = (await destClient.mutation(api.images.generateUploadUrl, {})) as any;
      const uploadUrl = generateRes.url as string;
      const newStorageId = generateRes.storageId as string;

      // 3. PUT blob
      await fetch(uploadUrl, { method: "PUT", body: Buffer.from(arrayBuf) });

      // 4. Insert image record in dest
      await destClient.mutation(api.migration.createImageForMigration, {
        userId: destUserId as any,
        storageId: newStorageId,
        fileName: img.fileName,
        contentType: img.contentType,
        fileSize: img.fileSize,
        _creationTime: img._creationTime,
      });

      // 5. Patch profile if needed
      const destProfileId = profileMap.get(img.userId);
      if (destProfileId) {
        await destClient.mutation(api.migration.patchProfileImageIds, {
          profileId: destProfileId as any,
          oldId: img.storageId as any,
          newId: newStorageId as any,
        });
      }

      success++;
    } catch (err) {
      console.error(`Failed to migrate image ${img._id}:`, err);
      failed++;
    }
  }

  console.log("--- Image Migration Summary ---");
  console.log(`Migrated: ${success}`);
  console.log(`Skipped (no user mapping): ${skipped}`);
  console.log(`Failed: ${failed}`);
}

(async () => {
  console.log("Starting image migration...");
  await migrateImages();
})(); 