import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface SessionTokenPayload extends JWTPayload {
  sessionId: string;
  type: 'session';
}

export interface VerificationTokenPayload {
  userId: string;
  email: string;
  type: 'email_verification' | 'password_reset' | 'email_change';
  iat?: number;
  exp?: number;
}

/**
 * JWT token management utilities
 */
export class JWTUtils {
  private static readonly ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'your-secret-key-change-this';
  private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this';
  private static readonly VERIFICATION_TOKEN_SECRET = process.env.JWT_VERIFICATION_SECRET || 'your-verification-secret-key-change-this';

  // Token expiration times
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';
  private static readonly VERIFICATION_TOKEN_EXPIRY = '24h';
  private static readonly PASSWORD_RESET_TOKEN_EXPIRY = '1h';

  /**
   * Generate an access token
   * @param payload - JWT payload
   * @returns string - JWT token
   */
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'aroosi-auth',
      audience: 'aroosi-client'
    });
  }

  /**
   * Generate a refresh token
   * @param payload - JWT payload
   * @returns string - JWT token
   */
  static generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.REFRESH_TOKEN_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      issuer: 'aroosi-auth',
      audience: 'aroosi-client'
    });
  }

  /**
   * Generate a session token (combines access and refresh functionality)
   * @param payload - Session token payload
   * @returns string - JWT token
   */
  static generateSessionToken(payload: SessionTokenPayload): string {
    return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY, // Longer expiry for sessions
      issuer: 'aroosi-auth',
      audience: 'aroosi-client'
    });
  }

  /**
   * Generate a verification token (email verification, password reset, etc.)
   * @param payload - Verification token payload
   * @returns string - JWT token
   */
  static generateVerificationToken(payload: VerificationTokenPayload): string {
    const expiry = payload.type === 'password_reset' 
      ? this.PASSWORD_RESET_TOKEN_EXPIRY 
      : this.VERIFICATION_TOKEN_EXPIRY;

    return jwt.sign(payload, this.VERIFICATION_TOKEN_SECRET, {
      expiresIn: expiry,
      issuer: 'aroosi-auth',
      audience: 'aroosi-client'
    });
  }

  /**
   * Verify an access token
   * @param token - JWT token
   * @returns JWTPayload | null
   */
  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
        issuer: 'aroosi-auth',
        audience: 'aroosi-client'
      }) as JWTPayload;
      
      return payload;
    } catch (error) {
      console.error('Access token verification failed:', error);
      return null;
    }
  }

  /**
   * Verify a refresh token
   * @param token - JWT token
   * @returns JWTPayload | null
   */
  static verifyRefreshToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, this.REFRESH_TOKEN_SECRET, {
        issuer: 'aroosi-auth',
        audience: 'aroosi-client'
      }) as JWTPayload;
      
      return payload;
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  /**
   * Verify a session token
   * @param token - JWT token
   * @returns SessionTokenPayload | null
   */
  static verifySessionToken(token: string): SessionTokenPayload | null {
    try {
      const payload = jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
        issuer: 'aroosi-auth',
        audience: 'aroosi-client'
      }) as SessionTokenPayload;
      
      return payload;
    } catch (error) {
      console.error('Session token verification failed:', error);
      return null;
    }
  }

  /**
   * Verify a verification token
   * @param token - JWT token
   * @returns VerificationTokenPayload | null
   */
  static verifyVerificationToken(token: string): VerificationTokenPayload | null {
    try {
      const payload = jwt.verify(token, this.VERIFICATION_TOKEN_SECRET, {
        issuer: 'aroosi-auth',
        audience: 'aroosi-client'
      }) as VerificationTokenPayload;
      
      return payload;
    } catch (error) {
      console.error('Verification token verification failed:', error);
      return null;
    }
  }

  /**
   * Decode a token without verification (for debugging)
   * @param token - JWT token
   * @returns any - Decoded payload
   */
  static decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      console.error('Token decode failed:', error);
      return null;
    }
  }

  /**
   * Check if a token is expired
   * @param token - JWT token
   * @returns boolean
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        return true;
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time
   * @param token - JWT token
   * @returns number | null - Expiration timestamp
   */
  static getTokenExpiration(token: string): number | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.exp || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate a secure random token (for non-JWT use cases)
   * @param length - Token length in bytes (default: 32)
   * @returns string - Hex encoded token
   */
  static generateSecureToken(length = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * Extract token from Authorization header
   * @param authHeader - Authorization header value
   * @returns string | null - Token or null
   */
  static extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  /**
   * Calculate time until token expiration
   * @param token - JWT token
   * @returns number - Seconds until expiration (0 if expired)
   */
  static getTimeUntilExpiration(token: string): number {
    const exp = this.getTokenExpiration(token);
    if (!exp) return 0;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return Math.max(0, exp - currentTime);
  }

  /**
   * Check if token needs refresh (expires within 5 minutes)
   * @param token - JWT token
   * @returns boolean
   */
  static needsRefresh(token: string): boolean {
    const timeUntilExpiration = this.getTimeUntilExpiration(token);
    return timeUntilExpiration > 0 && timeUntilExpiration < 300; // 5 minutes
  }
}