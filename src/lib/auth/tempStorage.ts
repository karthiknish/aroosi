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
  lastName: string
): void {
  // Normalize email to lowercase for consistent storage
  const normalizedEmail = email.toLowerCase().trim();
  const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

  console.log("Storing temp user:", {
    originalEmail: email,
    normalizedEmail,
    expiresAt: new Date(expiresAt).toISOString(),
  });

  tempUserStore.set(normalizedEmail, {
    email: normalizedEmail,
    hashedPassword,
    firstName,
    lastName,
    expiresAt,
  });
}

export function getTempUser(email: string): TempUserData | null {
  // Normalize email to lowercase for consistent lookup
  const normalizedEmail = email.toLowerCase().trim();

  console.log("Getting temp user:", {
    originalEmail: email,
    normalizedEmail,
    storeKeys: Array.from(tempUserStore.keys()),
  });

  const userData = tempUserStore.get(normalizedEmail);

  if (!userData) {
    console.log("No temp user data found for:", normalizedEmail);
    return null;
  }

  const now = Date.now();
  if (now > userData.expiresAt) {
    console.log("Temp user data expired:", {
      email: normalizedEmail,
      now: new Date(now).toISOString(),
      expiresAt: new Date(userData.expiresAt).toISOString(),
    });
    tempUserStore.delete(normalizedEmail);
    return null;
  }

  console.log("Temp user data retrieved successfully:", {
    email: normalizedEmail,
    firstName: userData.firstName,
    lastName: userData.lastName,
  });
  return userData;
}

export function deleteTempUser(email: string): void {
  // Normalize email to lowercase for consistent deletion
  const normalizedEmail = email.toLowerCase().trim();
  console.log("Deleting temp user:", {
    originalEmail: email,
    normalizedEmail,
  });
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
