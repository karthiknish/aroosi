// Simple in-memory storage for OTP codes
// In a production environment, you would use a database or Redis

// Define the structure for stored OTP
interface StoredOTP {
  code: string;
  expiresAt: number; // timestamp in milliseconds
}

// In-memory storage (for development only)
const otpStorage = new Map<string, StoredOTP>();

/**
 * Store an OTP code for an email
 * @param email The email address
 * @param code The OTP code
 * @param expiresInMs The time in milliseconds after which the OTP expires (default: 10 minutes)
 */
export async function storeOTP(
  email: string,
  code: string,
  expiresInMs: number = 10 * 60 * 1000 // 10 minutes
): Promise<void> {
  const expiresAt = Date.now() + expiresInMs;
  otpStorage.set(email.toLowerCase(), { code, expiresAt });
}

/**
 * Retrieve a stored OTP code for an email
 * @param email The email address
 * @returns The stored OTP or null if not found or expired
 */
export async function getStoredOTP(email: string): Promise<StoredOTP | null> {
  const key = email.toLowerCase();
  const stored = otpStorage.get(key);
  
  if (!stored) {
    return null;
  }
  
  // Check if OTP has expired
  if (Date.now() > stored.expiresAt) {
    // Delete expired OTP
    otpStorage.delete(key);
    return null;
  }
  
  return stored;
}

/**
 * Delete a stored OTP code for an email
 * @param email The email address
 */
export async function deleteStoredOTP(email: string): Promise<void> {
  otpStorage.delete(email.toLowerCase());
}

/**
 * Clear all stored OTP codes (useful for testing)
 */
export async function clearAllOTPs(): Promise<void> {
  otpStorage.clear();
}