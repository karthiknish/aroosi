import { verifyJWT } from "@/lib/auth/jwt";

/**
 * JWT validation for native authentication
 */
export interface JWTValidationResult {
  valid: boolean;
  payload?: Record<string, unknown>;
  userId?: string;
  email?: string;
  role?: string;
  error?: string;
  isExpired?: boolean;
}

/**
 * Validates JWT token with our native auth secret
 */
export async function validateJWTToken(
  token: string,
): Promise<JWTValidationResult> {
  try {
    if (!token || typeof token !== "string") {
      return { valid: false, error: "Invalid token format" };
    }

    // Use our existing JWT verification
    const payload = await verifyJWT(token);

    // Extract user information
    const userId = payload.userId;
    const email = payload.email;
    const role = payload.role || "user";

    return {
      valid: true,
      payload: payload as unknown as Record<string, unknown>,
      userId,
      email,
      role,
    };
  } catch (error) {
    console.error("JWT validation error:", error);

    // Check if it's an expiration error
    if (error instanceof Error && error.message.includes("expired")) {
      return { valid: false, error: "Token expired", isExpired: true };
    }

    return {
      valid: false,
      error: error instanceof Error ? error.message : "Token validation failed",
    };
  }
}

/**
 * Extract role from JWT payload
 */
function extractRoleFromPayload(
  payload: Record<string, unknown>,
): string | undefined {
  // Native auth puts role directly in payload
  return (payload.role as string) || "user";
}

/**
 * Validate token without signature verification (fallback)
 */
export function validateTokenBasic(token: string): JWTValidationResult {
  try {
    const [, payloadPart] = token.split(".");
    if (!payloadPart) {
      return { valid: false, error: "Invalid token structure" };
    }

    const padded = payloadPart
      .padEnd(payloadPart.length + ((4 - (payloadPart.length % 4)) % 4), "=")
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp ? payload.exp < now : false;

    if (isExpired) {
      return {
        valid: false,
        error: "Token expired",
        isExpired: true,
        userId: payload.userId,
        email: payload.email,
        role: extractRoleFromPayload(payload),
      };
    }

    return {
      valid: true,
      payload,
      userId: payload.userId,
      email: payload.email,
      role: extractRoleFromPayload(payload),
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Token validation failed",
    };
  }
}

/**
 * Check if token is about to expire (within 5 minutes)
 */
export function isTokenNearExpiry(token: string): boolean {
  try {
    const validation = validateTokenBasic(token);
    const exp = validation.payload?.exp;
    if (!validation.valid || typeof exp !== "number") {
      return true; // Treat invalid tokens or missing/invalid exp as expired
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = exp - now;
    return expiresIn < 300; // 5 minutes
  } catch {
    return true;
  }
}

/**
 * Extract all claims from token safely
 */
export function extractTokenClaims(
  token: string,
): Record<string, unknown> | null {
  try {
    const validation = validateTokenBasic(token);
    return validation.valid && validation.payload ? validation.payload : null;
  } catch {
    return null;
  }
}

/**
 * Validate token permissions for specific actions
 */
export function validateTokenPermissions(
  token: string,
  requiredPermissions: string[],
): { valid: boolean; missingPermissions?: string[] } {
  const validation = validateTokenBasic(token);

  if (!validation.valid) {
    return { valid: false, missingPermissions: requiredPermissions };
  }

  const userRole = validation.role || "user";
  const permissions = getRolePermissions(userRole);

  const missing = requiredPermissions.filter(
    (perm) => !permissions.includes(perm),
  );

  return {
    valid: missing.length === 0,
    missingPermissions: missing.length > 0 ? missing : undefined,
  };
}

/**
 * Get permissions for a role
 */
function getRolePermissions(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    admin: [
      "read:profiles",
      "write:profiles",
      "delete:profiles",
      "read:messages",
      "write:messages",
      "read:matches",
      "write:matches",
      "read:admin",
      "write:admin",
    ],
    premium: [
      "read:profiles",
      "write:own_profile",
      "read:messages",
      "write:messages",
      "read:matches",
      "write:matches",
      "read:premium_features",
    ],
    premiumPlus: [
      "read:profiles",
      "write:own_profile",
      "read:messages",
      "write:messages",
      "read:matches",
      "write:matches",
      "read:premium_features",
      "read:premium_plus_features",
      "write:premium_plus_features",
    ],
    user: ["read:own_profile", "write:own_profile"],
  };

  return rolePermissions[role] || rolePermissions.user;
}
