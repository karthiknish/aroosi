import { jwtVerify, importSPKI } from 'jose';

/**
 * Enhanced JWT validation with signature verification
 */
export interface JWTValidationResult {
  valid: boolean;
  payload?: any;
  userId?: string;
  role?: string;
  error?: string;
  isExpired?: boolean;
}

/**
 * Cache for Clerk's public keys (in production, use Redis)
 */
const publicKeyCache = new Map<string, CryptoKey>();
const PUBLIC_KEY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Validates JWT token with signature verification
 */
export async function validateJWTToken(token: string): Promise<JWTValidationResult> {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Invalid token format' };
    }

    // Parse JWT header to get key ID
    const [headerPart] = token.split('.');
    if (!headerPart) {
      return { valid: false, error: 'Invalid token structure' };
    }

    const header = JSON.parse(
      Buffer.from(
        headerPart.padEnd(headerPart.length + ((4 - (headerPart.length % 4)) % 4), '=')
          .replace(/-/g, '+')
          .replace(/_/g, '/'),
        'base64'
      ).toString('utf-8')
    );

    // Get public key for verification
    const publicKey = await getPublicKey(header.kid);
    if (!publicKey) {
      return { valid: false, error: 'Unable to verify token signature' };
    }

    // Verify token signature
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: `https://clerk.${process.env.CLERK_SECRET_KEY?.split('_')[1]}.com`, // Clerk issuer
      audience: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.split('_')[1], // Clerk audience
    });

    // Extract user information
    const userId = payload.sub || (payload as any).userId;
    const role = extractRoleFromPayload(payload);

    // Check token expiration
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp ? payload.exp < now : false;

    if (isExpired) {
      return { 
        valid: false, 
        error: 'Token expired', 
        isExpired: true,
        userId,
        role 
      };
    }

    return {
      valid: true,
      payload,
      userId,
      role,
    };

  } catch (error) {
    console.error('JWT validation error:', error);
    
    // Check if it's an expiration error
    if (error instanceof Error && error.message.includes('exp')) {
      return { valid: false, error: 'Token expired', isExpired: true };
    }
    
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Token validation failed' 
    };
  }
}

/**
 * Get Clerk's public key for JWT verification
 */
async function getPublicKey(keyId: string): Promise<CryptoKey | null> {
  try {
    // Check cache first
    const cached = publicKeyCache.get(keyId);
    if (cached) {
      return cached;
    }

    // Fetch public key from Clerk's JWKS endpoint
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error('CLERK_SECRET_KEY not configured');
      return null;
    }

    const instanceId = clerkSecretKey.split('_')[1];
    const jwksUrl = `https://clerk.${instanceId}.com/.well-known/jwks.json`;

    const response = await fetch(jwksUrl, {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch JWKS: ${response.status}`);
    }

    const jwks = await response.json();
    const key = jwks.keys.find((k: any) => k.kid === keyId);

    if (!key) {
      throw new Error(`Key ${keyId} not found in JWKS`);
    }

    // Convert JWK to PEM format
    const pemKey = await jwkToPem(key);
    const publicKey = await importSPKI(pemKey, key.alg);

    // Cache the key
    publicKeyCache.set(keyId, publicKey);

    // Set cache expiration
    setTimeout(() => {
      publicKeyCache.delete(keyId);
    }, PUBLIC_KEY_CACHE_TTL);

    return publicKey;

  } catch (error) {
    console.error('Error fetching public key:', error);
    return null;
  }
}

/**
 * Convert JWK to PEM format
 */
async function jwkToPem(jwk: any): Promise<string> {
  // This is a simplified version - in production, use a proper JWK to PEM library
  if (jwk.kty !== 'RSA') {
    throw new Error('Only RSA keys are supported');
  }

  // For now, return a placeholder - you should implement proper JWK to PEM conversion
  // or use a library like 'jwk-to-pem'
  throw new Error('JWK to PEM conversion not implemented - use jwk-to-pem library');
}

/**
 * Extract role from JWT payload
 */
function extractRoleFromPayload(payload: any): string | undefined {
  // Clerk puts role in publicMetadata or public_metadata
  if (payload.publicMetadata?.role) {
    return payload.publicMetadata.role;
  }
  
  if (payload.public_metadata?.role) {
    return payload.public_metadata.role;
  }
  
  return undefined;
}

/**
 * Validate token without signature verification (fallback)
 */
export function validateTokenBasic(token: string): JWTValidationResult {
  try {
    const [, payloadPart] = token.split('.');
    if (!payloadPart) {
      return { valid: false, error: 'Invalid token structure' };
    }

    const padded = payloadPart
      .padEnd(payloadPart.length + ((4 - (payloadPart.length % 4)) % 4), '=')
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp ? payload.exp < now : false;

    if (isExpired) {
      return { 
        valid: false, 
        error: 'Token expired', 
        isExpired: true,
        userId: payload.sub || payload.userId,
        role: extractRoleFromPayload(payload)
      };
    }

    return {
      valid: true,
      payload,
      userId: payload.sub || payload.userId,
      role: extractRoleFromPayload(payload),
    };

  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Token validation failed' 
    };
  }
}

/**
 * Check if token is about to expire (within 5 minutes)
 */
export function isTokenNearExpiry(token: string): boolean {
  try {
    const validation = validateTokenBasic(token);
    if (!validation.valid || !validation.payload?.exp) {
      return true; // Treat invalid tokens as expired
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = validation.payload.exp - now;
    
    return expiresIn < 300; // 5 minutes
  } catch {
    return true;
  }
}

/**
 * Extract all claims from token safely
 */
export function extractTokenClaims(token: string): Record<string, any> | null {
  try {
    const validation = validateTokenBasic(token);
    return validation.valid ? validation.payload : null;
  } catch {
    return null;
  }
}

/**
 * Validate token permissions for specific actions
 */
export function validateTokenPermissions(
  token: string, 
  requiredPermissions: string[]
): { valid: boolean; missingPermissions?: string[] } {
  const validation = validateTokenBasic(token);
  
  if (!validation.valid) {
    return { valid: false, missingPermissions: requiredPermissions };
  }

  const userRole = validation.role || 'user';
  const permissions = getRolePermissions(userRole);
  
  const missing = requiredPermissions.filter(perm => !permissions.includes(perm));
  
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
      'read:profiles',
      'write:profiles', 
      'delete:profiles',
      'read:messages',
      'write:messages',
      'read:matches',
      'write:matches',
      'read:admin',
      'write:admin',
    ],
    premium: [
      'read:profiles',
      'write:own_profile',
      'read:messages',
      'write:messages',
      'read:matches',
      'write:matches',
      'read:premium_features',
    ],
    premiumPlus: [
      'read:profiles',
      'write:own_profile',
      'read:messages',
      'write:messages',
      'read:matches',
      'write:matches',
      'read:premium_features',
      'read:premium_plus_features',
      'write:premium_plus_features',
    ],
    user: [
      'read:own_profile',
      'write:own_profile',
    ],
  };

  return rolePermissions[role] || rolePermissions.user;
}