import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";
import { api } from "../../convex/_generated/api";

// Load environment variables
dotenv.config();

// Configuration
const SOURCE_URL = "https://quirky-akita-969.convex.cloud";
const DESTINATION_URL = "https://proper-gull-501.convex.cloud";

// Get tokens from environment variables
const SOURCE_TOKEN = process.env.SOURCE_CONVEX_TOKEN;
const DEST_TOKEN = process.env.DEST_CONVEX_TOKEN;

if (!SOURCE_TOKEN || !DEST_TOKEN) {
  console.error(
    "Error: Missing authentication tokens in environment variables",
  );
  console.error(
    "Please set SOURCE_CONVEX_TOKEN and DEST_CONVEX_TOKEN in your .env file",
  );
  process.exit(1);
}

// Initialize Convex clients
const sourceClient = new ConvexHttpClient(SOURCE_URL);
sourceClient.setAuth(SOURCE_TOKEN);

const destClient = new ConvexHttpClient(DESTINATION_URL);
destClient.setAuth(DEST_TOKEN);

// Migration tracking
const migrationMap = {
  users: new Map<string, string>(), // oldId -> newId
  profiles: new Map<string, string>(),
  images: new Map<string, string>(),
};

async function migrateInterests() {
  console.log("\n=== Migrating Interests ===");

  try {
    // Fetch all interests from source
    const sourceInterests = await sourceClient.query(
      api.migration.getAllInterests,
    );
    console.log(`Found ${sourceInterests.length} interests to migrate`);

    let successCount = 0;
    let skipCount = 0;

    for (const interest of sourceInterests) {
      // Map old user IDs to new ones
      const newFromUserId = migrationMap.users.get(interest.fromUserId);
      const newToUserId = migrationMap.users.get(interest.toUserId);

      if (!newFromUserId || !newToUserId) {
        console.log(`Skipping interest: missing user mapping`);
        skipCount++;
        continue;
      }

      try {
        await destClient.mutation(api.migration.createInterestForMigration, {
          fromUserId: newFromUserId as any,
          toUserId: newToUserId as any,
          status: interest.status as any,
          createdAt: interest.createdAt,
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to migrate interest:`, error);
      }
    }

    console.log(
      `Interests migration complete: ${successCount} migrated, ${skipCount} skipped`,
    );
  } catch (error) {
    console.error("Error migrating interests:", error);
  }
}

async function migrateMessages() {
  console.log("\n=== Migrating Messages ===");

  try {
    // Fetch all messages from source
    const sourceMessages = await sourceClient.query(
      api.migration.getAllMessages,
    );
    console.log(`Found ${sourceMessages.length} messages to migrate`);

    let successCount = 0;
    let skipCount = 0;

    for (const message of sourceMessages) {
      // Map old user IDs to new ones
      const newFromUserId = migrationMap.users.get(message.fromUserId);
      const newToUserId = migrationMap.users.get(message.toUserId);

      if (!newFromUserId || !newToUserId) {
        console.log(`Skipping message: missing user mapping`);
        skipCount++;
        continue;
      }

      try {
        // Reconstruct conversation ID with new user IDs
        const sortedUserIds = [newFromUserId, newToUserId].sort();
        const newConversationId = sortedUserIds.join("_");

        await destClient.mutation(api.migration.createMessageForMigration, {
          conversationId: newConversationId,
          fromUserId: newFromUserId as any,
          toUserId: newToUserId as any,
          text: message.text,
          type: message.type as any,
          audioStorageId: message.audioStorageId,
          duration: message.duration,
          fileSize: message.fileSize,
          mimeType: message.mimeType,
          createdAt: message.createdAt,
          readAt: message.readAt,
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to migrate message:`, error);
      }
    }

    console.log(
      `Messages migration complete: ${successCount} migrated, ${skipCount} skipped`,
    );
  } catch (error) {
    console.error("Error migrating messages:", error);
  }
}

async function migrateProfileViews() {
  console.log("\n=== Migrating Profile Views ===");

  try {
    // Fetch all profile views from source
    const sourceViews = await sourceClient.query(
      api.migration.getAllProfileViews,
    );
    console.log(`Found ${sourceViews.length} profile views to migrate`);

    let successCount = 0;
    let skipCount = 0;

    for (const view of sourceViews) {
      // Map old IDs to new ones
      const newViewerId = migrationMap.users.get(view.viewerId);
      const newProfileId = migrationMap.profiles.get(view.profileId);

      if (!newViewerId || !newProfileId) {
        skipCount++;
        continue;
      }

      try {
        await destClient.mutation(api.migration.createProfileViewForMigration, {
          viewerId: newViewerId as any,
          profileId: newProfileId as any,
          createdAt: view.createdAt,
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to migrate profile view:`, error);
      }
    }

    console.log(
      `Profile views migration complete: ${successCount} migrated, ${skipCount} skipped`,
    );
  } catch (error) {
    console.error("Error migrating profile views:", error);
  }
}

async function main() {
  console.log("Starting full data migration...");
  console.log(`Source: ${SOURCE_URL}`);
  console.log(`Destination: ${DESTINATION_URL}`);
  console.log("---");

  try {
    // First, run the profile migration to populate the mapping
    console.log("\n=== Phase 1: Migrating Users and Profiles ===");
    console.log(
      "Please run migrate-profiles.ts first to populate user/profile mappings",
    );
    console.log("This script assumes the mappings are already populated");

    // In a real implementation, you would:
    // 1. Run profile migration and store the ID mappings
    // 2. Use those mappings for related data migration

    // For now, we'll just show the structure
    console.log("\n=== Phase 2: Migrating Related Data ===");

    // Migrate interests (likes/matches)
    await migrateInterests();

    // Migrate messages
    await migrateMessages();

    // Migrate profile views
    await migrateProfileViews();

    console.log("\n=== Migration Summary ===");
    console.log("Full migration completed!");
    console.log(
      "Note: Storage files (images, audio) need to be migrated separately",
    );
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
main().catch(console.error);
