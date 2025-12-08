/**
 * Generates a random 6-digit OTP
 * @returns A 6-digit numeric string
 */
export function generateOTP(): string {
  // Generate a random number between 100000 and 999999
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a random 6-character alphanumeric OTP
 * @returns A 6-character alphanumeric string
 */
export function generateAlphanumericOTP(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return otp;
}