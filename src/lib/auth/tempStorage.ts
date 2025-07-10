interface TempUserData {
  email: string;
  hashedPassword: string;
  firstName: string;
  lastName: string;
  expiresAt: number;
}

const tempUserStore = new Map<string, TempUserData>();

export function storeTempUser(
  email: string,
  hashedPassword: string,
  firstName: string,
  lastName: string,
): void {
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes
  tempUserStore.set(email, {
    email,
    hashedPassword,
    firstName,
    lastName,
    expiresAt,
  });
}

export function getTempUser(email: string): TempUserData | null {
  const userData = tempUserStore.get(email);

  if (!userData) {
    return null;
  }

  if (Date.now() > userData.expiresAt) {
    tempUserStore.delete(email);
    return null;
  }

  return userData;
}

export function deleteTempUser(email: string): void {
  tempUserStore.delete(email);
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
