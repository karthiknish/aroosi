// Test to check if we can initialize the Convex client
const { ConvexHttpClient } = require("convex/browser");

try {
  console.log("Attempting to create Convex client...");
  const convex = new ConvexHttpClient(
    process.env.NEXT_PUBLIC_CONVEX_URL || "https://quirky-akita-969.convex.cloud"
  );
  console.log("Convex client created successfully");
} catch (error) {
  console.error("Error creating Convex client:", error.message);
}