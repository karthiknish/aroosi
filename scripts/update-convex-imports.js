#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// List of files to update (from the grep output)
const filesToUpdate = [
  "src/app/api/saveChatbotMessage/route.ts",
  "src/app/api/public-profile/route.ts",
  "src/app/api/contact/route.ts",
  "src/app/api/images/blog/route.ts",
  "src/app/api/admin/matches/route.ts",
  "src/app/api/admin/matches/create/route.ts",
  "src/app/api/admin/profiles/route.ts",
  "src/app/api/admin/profiles/[id]/spotlight/route.ts",
  "src/app/api/admin/profiles/[id]/images/order/route.ts",
  "src/app/api/admin/profiles/[id]/matches/route.ts",
  "src/app/api/admin/profiles/[id]/route.ts",
  "src/app/api/admin/profiles/[id]/ban/route.ts",
  "src/app/api/admin/interests/route.ts",
  "src/app/api/profile-detail/[id]/images/route.ts",
  "src/app/api/profile-detail/[id]/route.ts",
  "src/app/api/matches/route.ts",
  "src/app/api/matches/unread/route.ts",
  "src/app/api/user/me/route.ts",
  "src/app/api/blog/route.ts",
  "src/app/api/blog/[slug]/route.ts",
  "src/app/api/subscription/cancel/route.ts",
  "src/app/api/subscription/validate-purchase/route.ts",
  "src/app/api/subscription/track-usage/route.ts",
  "src/app/api/subscription/features/route.ts",
  "src/app/api/subscription/usage-history/route.ts",
  "src/app/api/subscription/usage/route.ts",
  "src/app/api/subscription/can-use/[feature]/route.ts",
  "src/app/api/subscription/purchase/route.ts",
  "src/app/api/subscription/restore/route.ts",
  "src/app/api/search/route.ts",
  "src/app/api/profile/batch/route.ts",
  "src/app/api/conversations/[id]/mark-read/route.ts",
  "src/app/api/profile-images/order/route.ts",
  "src/app/api/profile-images/upload-url/route.ts",
  "src/app/api/profile-images/batch/route.ts",
  "src/app/api/profile-images/route.ts",
  "src/app/api/profile-images/main/route.ts",
  "src/app/api/interests/received/route.ts",
  "src/app/api/interests/status/route.ts",
  "src/app/api/interests/route.ts",
  "src/app/api/interests/respond.ts",
  "src/app/api/stripe/webhook/route.ts",
  "src/app/api/stripe/checkout/route.ts",
];

function updateFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, "utf8");
  let modified = false;

  // Check if file imports ConvexHttpClient
  if (!content.includes("ConvexHttpClient")) {
    console.log(`Skipping ${filePath} - no ConvexHttpClient import found`);
    return;
  }

  // Replace the import statement
  if (content.includes('import { ConvexHttpClient } from "convex/browser";')) {
    content = content.replace(
      'import { ConvexHttpClient } from "convex/browser";',
      'import { getConvexClient } from "@/lib/convexClient";',
    );
    modified = true;
  }

  // Replace instantiation patterns
  // Pattern 1: const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const pattern1 =
    /const\s+(\w+)\s*=\s*new\s+ConvexHttpClient\s*\(\s*process\.env\.NEXT_PUBLIC_CONVEX_URL!?\s*\);/g;
  if (pattern1.test(content)) {
    content = content.replace(pattern1, (match, varName) => {
      return `const ${varName} = getConvexClient();\n    if (!${varName}) return errorResponse("Convex client not configured", 500);`;
    });
    modified = true;
  }

  // Pattern 2: new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL) without assignment
  const pattern2 =
    /new\s+ConvexHttpClient\s*\(\s*process\.env\.NEXT_PUBLIC_CONVEX_URL!?\s*\)/g;
  if (pattern2.test(content)) {
    content = content.replace(pattern2, "getConvexClient()");
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, "utf8");
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`⚠️  No changes needed: ${filePath}`);
  }
}

console.log("Starting Convex client migration...\n");

filesToUpdate.forEach((file) => {
  try {
    updateFile(file);
  } catch (error) {
    console.error(`❌ Error updating ${file}:`, error.message);
  }
});

console.log("\nMigration complete!");
