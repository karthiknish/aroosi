#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// List of files that still have environment checks
const filesToClean = [
  "src/app/api/public-profile/route.ts",
  "src/app/api/admin/matches/route.ts",
  "src/app/api/admin/matches/create/route.ts",
  "src/app/api/admin/profiles/[id]/matches/route.ts",
  "src/app/api/profile-detail/[id]/route.ts",
  "src/app/api/matches/route.ts",
  "src/app/api/matches/unread/route.ts",
  "src/app/api/profile/batch/route.ts",
  "src/app/api/interests/received/route.ts",
  "src/app/api/interests/status/route.ts",
  "src/app/api/interests/route.ts",
  "src/app/api/interests/respond.ts",
  "src/app/api/stripe/webhook/route.ts",
];

function cleanupFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, "utf8");
  let modified = false;

  // Pattern to remove the environment check blocks
  // This matches blocks like:
  // if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  //   return NextResponse.json(...);
  // }
  const envCheckPattern =
    /\s*if\s*\(\s*!process\.env\.NEXT_PUBLIC_CONVEX_URL\s*\)\s*{\s*return\s+(?:NextResponse\.json|errorResponse)\([^}]+\);\s*}/g;

  if (envCheckPattern.test(content)) {
    content = content.replace(envCheckPattern, "");
    modified = true;
  }

  // Also handle single-line checks
  const singleLinePattern =
    /\s*if\s*\(\s*!process\.env\.NEXT_PUBLIC_CONVEX_URL\s*\)\s*return\s+[^;]+;/g;

  if (singleLinePattern.test(content)) {
    content = content.replace(singleLinePattern, "");
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf8");
    console.log(`✅ Cleaned: ${filePath}`);
  } else {
    console.log(`⚠️  No env checks found: ${filePath}`);
  }
}

console.log("Cleaning up redundant environment checks...\n");

filesToClean.forEach((file) => {
  try {
    cleanupFile(file);
  } catch (error) {
    console.error(`❌ Error cleaning ${file}:`, error.message);
  }
});

console.log("\nCleanup complete!");
