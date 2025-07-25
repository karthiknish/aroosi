import crypto from "crypto";

export interface OTPData {
  code: string;
  email: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OTPData>();

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function storeOTP(email: string, code: string): void {
  // Normalize email to lowercase for consistent storage
  const normalizedEmail = email.toLowerCase().trim();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  console.log("Storing OTP:", {
    originalEmail: email,
    normalizedEmail,
    code,
    expiresAt: new Date(expiresAt).toISOString(),
  });

  otpStore.set(normalizedEmail, {
    code,
    email: normalizedEmail,
    expiresAt,
    attempts: 0,
  });
}

export function verifyOTP(email: string, code: string): boolean {
  // Normalize email to lowercase for consistent lookup
  const normalizedEmail = email.toLowerCase().trim();
  // Normalize code by trimming whitespace and ensuring it's a string
  const normalizedCode = String(code).trim();

  console.log("=== OTP Verification Debug ===");
  console.log("Input:", {
    originalEmail: email,
    normalizedEmail,
    originalCode: code,
    normalizedCode,
    codeLength: normalizedCode.length,
    codeType: typeof code,
    normalizedCodeType: typeof normalizedCode,
  });

  console.log("Store state:", {
    totalEntries: otpStore.size,
    storeKeys: Array.from(otpStore.keys()),
    hasEmailKey: otpStore.has(normalizedEmail),
  });

  const otpData = otpStore.get(normalizedEmail);

  if (!otpData) {
    console.log("❌ OTP verification failed: No OTP data found");
    console.log(
      "Available OTP entries:",
      Array.from(otpStore.entries()).map(([email, data]) => ({
        email,
        code: data.code,
        codeType: typeof data.code,
        expiresAt: new Date(data.expiresAt).toISOString(),
        attempts: data.attempts,
        isExpired: Date.now() > data.expiresAt,
      }))
    );
    return false;
  }

  const now = Date.now();
  console.log("Time check:", {
    now: new Date(now).toISOString(),
    expiresAt: new Date(otpData.expiresAt).toISOString(),
    isExpired: now > otpData.expiresAt,
    timeRemaining: Math.max(0, otpData.expiresAt - now),
  });

  if (now > otpData.expiresAt) {
    console.log("❌ OTP verification failed: OTP expired");
    otpStore.delete(normalizedEmail);
    return false;
  }

  // Check attempts BEFORE incrementing
  if (otpData.attempts >= 3) {
    console.log("❌ OTP verification failed: Too many attempts already made", {
      attempts: otpData.attempts,
      maxAttempts: 3,
    });
    otpStore.delete(normalizedEmail);
    return false;
  }

  // Increment attempts
  otpData.attempts++;

  console.log("Code comparison:", {
    providedCode: normalizedCode,
    providedCodeLength: normalizedCode.length,
    storedCode: otpData.code,
    storedCodeLength: otpData.code.length,
    storedCodeType: typeof otpData.code,
    exactMatch: otpData.code === normalizedCode,
    attempts: otpData.attempts,
    maxAttempts: 3,
  });

  if (otpData.code === normalizedCode) {
    console.log("✅ OTP verification successful!");
    otpStore.delete(normalizedEmail);
    return true;
  }

  console.log("❌ OTP verification failed: Code mismatch");

  // Don't delete on failed attempt, allow retry up to max attempts
  if (otpData.attempts >= 3) {
    console.log("Max attempts reached, deleting OTP");
    otpStore.delete(normalizedEmail);
  }

  return false;
}

export function cleanupExpiredOTPs(): void {
  const now = Date.now();
  const entries = Array.from(otpStore.entries());
  for (const [email, otpData] of entries) {
    if (now > otpData.expiresAt) {
      otpStore.delete(email);
    }
  }
}

// Debug function to check OTP status
export function getOTPStatus(email: string): {
  exists: boolean;
  expired?: boolean;
  attempts?: number;
  timeRemaining?: number;
  code?: string; // Only in development
} {
  const normalizedEmail = email.toLowerCase().trim();
  const otpData = otpStore.get(normalizedEmail);

  if (!otpData) {
    return { exists: false };
  }

  const now = Date.now();
  const expired = now > otpData.expiresAt;
  const timeRemaining = Math.max(0, otpData.expiresAt - now);

  const status = {
    exists: true,
    expired,
    attempts: otpData.attempts,
    timeRemaining: Math.floor(timeRemaining / 1000), // in seconds
  };

  // Only include the actual code in development for debugging
  if (process.env.NODE_ENV === "development") {
    (status as any).code = otpData.code;
  }

  return status;
}

// Debug function to get all OTP entries (development only)
export function getAllOTPs(): Array<{
  email: string;
  code: string;
  expiresAt: string;
  attempts: number;
  expired: boolean;
}> {
  if (process.env.NODE_ENV !== "development") {
    return [];
  }

  const now = Date.now();
  return Array.from(otpStore.entries()).map(([email, data]) => ({
    email,
    code: data.code,
    expiresAt: new Date(data.expiresAt).toISOString(),
    attempts: data.attempts,
    expired: now > data.expiresAt,
  }));
}

// Clean up expired OTPs every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);
