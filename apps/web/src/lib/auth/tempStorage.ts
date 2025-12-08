interface TempUserData {
  email: string;
  hashedPassword: string;
  fullName: string;
  expiresAt: number;
}

const tempUserStore = new Map<string, TempUserData>();

export function storeTempUser(
  email: string,
  hashedPassword: string,
  fullName: string
): void {
  // Normalize email to lowercase for consistent storage
  const normalizedEmail = email.toLowerCase().trim();
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

  // temp user stored in memory with TTL

  tempUserStore.set(normalizedEmail, {
    email: normalizedEmail,
    hashedPassword,
    fullName,
    expiresAt,
  });
}

export function getTempUser(email: string): TempUserData | null {
  // Normalize email to lowercase for consistent lookup
  const normalizedEmail = email.toLowerCase().trim();

  // lookup temp user

  const userData = tempUserStore.get(normalizedEmail);

  if (!userData) {
    return null;
  }

  const now = Date.now();
  if (now > userData.expiresAt) {
    tempUserStore.delete(normalizedEmail);
    return null;
  }

  return userData;
}

export function deleteTempUser(email: string): void {
  // Normalize email to lowercase for consistent deletion
  const normalizedEmail = email.toLowerCase().trim();
  tempUserStore.delete(normalizedEmail);
}

export function cleanupExpiredTempUsers(): void {
  const now = Date.now();
  const entries = Array.from(tempUserStore.entries());
  for (const [email, userData] of entries) {
    if (now > userData.expiresAt) {
      tempUserStore.delete(email);
    }
  }
}

// Clean up expired temp users every 10 minutes
setInterval(cleanupExpiredTempUsers, 10 * 60 * 1000);
