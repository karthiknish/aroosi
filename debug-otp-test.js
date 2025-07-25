// Debug script to test OTP functionality
// Run this with: node debug-otp-test.js

const baseUrl = "http://localhost:3000"; // Adjust if your dev server runs on different port

async function testOTPFlow() {
  console.log("🧪 Testing OTP Flow...\n");

  const testEmail = "test@example.com";
  const testData = {
    email: testEmail,
    password: "testpassword123",
    firstName: "Test",
    lastName: "User",
  };

  try {
    // Step 1: Sign up to generate OTP
    console.log("1️⃣ Signing up to generate OTP...");
    const signupResponse = await fetch(`${baseUrl}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData),
    });

    const signupResult = await signupResponse.json();
    console.log("Signup response:", signupResult);

    if (!signupResponse.ok) {
      console.error("❌ Signup failed:", signupResult);
      return;
    }

    // Step 2: Check OTP status
    console.log("\n2️⃣ Checking OTP status...");
    const debugResponse = await fetch(`${baseUrl}/api/auth/debug-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail }),
    });

    const debugResult = await debugResponse.json();
    console.log("Debug response:", JSON.stringify(debugResult, null, 2));

    if (!debugResult.otp.exists) {
      console.error("❌ No OTP found after signup");
      return;
    }

    const storedOTP = debugResult.otp.code;
    console.log(`📧 OTP generated: ${storedOTP}`);

    // Step 3: Test OTP verification with correct code
    console.log("\n3️⃣ Testing OTP verification with correct code...");
    const verifyResponse = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        otp: storedOTP,
      }),
    });

    const verifyResult = await verifyResponse.json();
    console.log("Verify response:", JSON.stringify(verifyResult, null, 2));

    if (verifyResponse.ok) {
      console.log("✅ OTP verification successful!");
    } else {
      console.log("❌ OTP verification failed:", verifyResult);

      // Check OTP status after failed verification
      console.log("\n🔍 Checking OTP status after failed verification...");
      const debugResponse2 = await fetch(`${baseUrl}/api/auth/debug-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });

      const debugResult2 = await debugResponse2.json();
      console.log(
        "Debug response after failure:",
        JSON.stringify(debugResult2, null, 2)
      );
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error);
  }
}

// Run the test
testOTPFlow();
