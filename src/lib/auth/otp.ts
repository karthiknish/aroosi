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
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  otpStore.set(email, {
    code,
    email,
    expiresAt,
    attempts: 0,
  });
}

export function verifyOTP(email: string, code: string): boolean {
  const otpData = otpStore.get(email);

  if (!otpData) {
    return false;
  }

  if (Date.now() > otpData.expiresAt) {
    otpStore.delete(email);
    return false;
  }

  otpData.attempts++;

  if (otpData.attempts > 3) {
    otpStore.delete(email);
    return false;
  }

  if (otpData.code === code) {
    otpStore.delete(email);
    return true;
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

// Clean up expired OTPs every 5 minutes
setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);
