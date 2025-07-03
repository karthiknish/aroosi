#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("Aroosi Profile Migration Tool");
console.log("=============================\n");

const SOURCE_URL = "https://quirky-akita-969.convex.cloud";
const DEST_URL = "https://proper-gull-501.convex.cloud";

// Helper function to run Convex commands
function runConvexCommand(functionName, url) {
  try {
    const cmd = `npx convex run ${functionName} --url ${url} --prod`;
    console.log(`Running: ${cmd}`);
    const result = execSync(cmd, {
      encoding: "utf8",
      cwd: path.join(__dirname, "../.."),
    });
    return JSON.parse(result);
  } catch (error) {
    console.error(`Error running ${functionName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("Step 1: Fetching data from source instance...");
  console.log(`Source: ${SOURCE_URL}\n`);

  const sourceProfiles = runConvexCommand(
    "migration:getAllProfiles",
    SOURCE_URL,
  );
  const sourceUsers = runConvexCommand("migration:getAllUsers", SOURCE_URL);

  if (!sourceProfiles || !sourceUsers) {
    console.error(
      "Failed to fetch source data. Make sure you have deployed the migration functions.",
    );
    process.exit(1);
  }

  console.log(`\nFetched ${sourceProfiles.length} profiles from source`);
  console.log(`Fetched ${sourceUsers.length} users from source`);

  console.log("\nStep 2: Fetching data from destination instance...");
  console.log(`Destination: ${DEST_URL}\n`);

  const destProfiles = runConvexCommand("migration:getAllProfiles", DEST_URL);
  const destUsers = runConvexCommand("migration:getAllUsers", DEST_URL);

  if (!destProfiles || !destUsers) {
    console.error("Failed to fetch destination data.");
    process.exit(1);
  }

  console.log(`\nFetched ${destProfiles.length} profiles from destination`);
  console.log(`Fetched ${destUsers.length} users from destination`);

  // Find missing profiles
  const destClerkIds = new Set(destProfiles.map((p) => p.clerkId));
  const missingProfiles = sourceProfiles.filter(
    (p) => !destClerkIds.has(p.clerkId),
  );

  console.log(`\nFound ${missingProfiles.length} missing profiles`);

  if (missingProfiles.length === 0) {
    console.log("All profiles are in sync!");
    return;
  }

  // Save missing profiles to a file
  const outputPath = path.join(__dirname, "missing-profiles.json");
  fs.writeFileSync(outputPath, JSON.stringify(missingProfiles, null, 2));

  console.log(`\nMissing profiles saved to: ${outputPath}`);
  console.log("\nTo import these profiles:");
  console.log("1. Review the missing-profiles.json file");
  console.log("2. Use the Convex dashboard or create import mutations");
}

main().catch(console.error);
