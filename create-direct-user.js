// Script to create a test user directly using Convex
const { ConvexHttpClient } = require("convex/browser");

async function createTestUser() {
  try {
    console.log("Creating test user directly with Convex...");
    
    // Create Convex client
    const convex = new ConvexHttpClient("https://quirky-akita-969.convex.cloud");
    
    // Test user data
    const userData = {
      email: "testuser@example.com",
      name: "Test User",
      picture: undefined,
      googleId: undefined,
    };
    
    console.log("Calling createUserAndProfile with:", userData);
    
    // Create the user
    const userId = await convex.mutation("users:createUserAndProfile", userData);
    
    console.log("User created successfully with ID:", userId);
    console.log("Test user creation completed!");
  } catch (error) {
    console.error("Error creating test user:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
    if (error.stack) {
      console.error("Stack trace:", error.stack);
    }
  }
}

createTestUser();