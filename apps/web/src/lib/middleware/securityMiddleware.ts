import { NextRequest, NextResponse } from 'next/server';
import { 
  applySecurityHeaders, 
  checkApiRateLimit, 
  validateRequestOrigin,
  logSecurityEvent,
  createSecureErrorResponse 
} from '@/lib/utils/securityHeaders';

/**
 * Rate limiting configuration per endpoint
 */
const RATE_LIMITS = {
  // Authentication endpoints
  '/api/auth/login': { requests: 5, window: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  '/api/auth/register': { requests: 3, window: 15 * 60 * 1000 }, // 3 requests per 15 minutes
  
  // Profile operations
  '/api/profile': { requests: 100, window: 60 * 60 * 1000 }, // 100 requests per hour
  '/api/profile/boost': { requests: 10, window: 60 * 60 * 1000 }, // 10 boosts per hour
  
  // Search operations
  '/api/search': { requests: 200, window: 60 * 60 * 1000 }, // 200 searches per hour
  '/api/search-images': { requests: 50, window: 60 * 60 * 1000 }, // 50 image searches per hour
  
  // Interest operations
  '/api/interests': { requests: 50, window: 60 * 60 * 1000 }, // 50 interests per hour
  
  // Image operations
  '/api/profile-images': { requests: 20, window: 60 * 60 * 1000 }, // 20 image operations per hour
  '/api/profile-images/upload-url': { requests: 10, window: 60 * 60 * 1000 }, // 10 uploads per hour
  
  // Admin operations (stricter limits)
  '/api/admin': { requests: 1000, window: 60 * 60 * 1000 }, // 1000 admin operations per hour
  
  // Contact form
  '/api/contact': { requests: 5, window: 10 * 60 * 1000 }, // 5 contacts per 10 minutes
  
  // AI/Chat operations
  '/api/gemini-chat': { requests: 20, window: 60 * 60 * 1000 }, // 20 AI chats per hour
  
  // Payment operations
  '/api/stripe/checkout': { requests: 10, window: 60 * 60 * 1000 }, // 10 checkouts per hour
  
  // Default rate limit
  'default': { requests: 100, window: 60 * 60 * 1000 }, // 100 requests per hour
} as const;

/**
 * Security middleware for API routes
 */
export async function securityMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for non-API routes
  if (!pathname.startsWith('/api/')) {
    return null;
  }

  try {
    // 1. Validate request origin
    if (!validateRequestOrigin(request)) {
      logSecurityEvent('UNAUTHORIZED_ACCESS', { reason: 'Invalid origin' }, request);
      return createSecureErrorResponse('Invalid request origin', 403);
    }

    // 2. Check rate limiting
    const rateLimitResult = await checkRateLimit(request, pathname);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { 
        path: pathname,
        remaining: rateLimitResult.remaining 
      }, request);
      
      const response = createSecureErrorResponse('Rate limit exceeded', 429);
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
      return response;
    }

    // 3. Validate content length for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentLength = request.headers.get('content-length');
      const maxSize = getMaxContentSize(pathname);
      
      if (contentLength && parseInt(contentLength) > maxSize) {
        logSecurityEvent('VALIDATION_FAILED', { 
          reason: 'Content too large',
          size: contentLength,
          maxSize 
        }, request);
        return createSecureErrorResponse('Request too large', 413);
      }
    }

    // 4. Validate content type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type');
      
      // Allow form data for file uploads
      if (pathname.includes('/upload') || pathname.includes('/images')) {
        if (!contentType || (!contentType.includes('application/json') && !contentType.includes('multipart/form-data'))) {
          return createSecureErrorResponse('Invalid content type', 400);
        }
      } else {
        if (!contentType || !contentType.includes('application/json')) {
          return createSecureErrorResponse('Invalid content type', 400);
        }
      }
    }

    // Continue to the API route
    return null;

  } catch (error) {
    console.error('Security middleware error:', error);
    logSecurityEvent('VALIDATION_FAILED', { error: String(error) }, request);
    return createSecureErrorResponse('Security validation failed', 500);
  }
}

/**
 * Enhanced rate limiting with per-user and per-IP tracking
 */
async function checkRateLimit(request: NextRequest, pathname: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}> {
  // Get rate limit config for this endpoint
  const config = getRateLimitConfig(pathname);
  
  // Use IP address as identifier for unauthenticated requests
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
            request.headers.get('x-real-ip') || 
            'unknown';
  
  // Try to get user ID from auth header for authenticated requests
  let userId: string | null = null;
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      userId = extractUserIdFromToken(token);
    }
  } catch {
    // Ignore auth parsing errors for rate limiting
  }
  
  // Use user ID if available, otherwise use IP
  const identifier = userId ? `user:${userId}` : `ip:${ip}`;
  
  const result = checkApiRateLimit(identifier, config.requests, config.window);
  
  return {
    ...result,
    limit: config.requests,
  };
}

/**
 * Get rate limit configuration for a specific path
 */
function getRateLimitConfig(pathname: string): { requests: number; window: number } {
  // Check for exact matches first
  if (pathname in RATE_LIMITS) {
    return RATE_LIMITS[pathname as keyof typeof RATE_LIMITS];
  }
  
  // Check for prefix matches
  for (const [path, config] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(path) && path !== 'default') {
      return config;
    }
  }
  
  // Return default rate limit
  return RATE_LIMITS.default;
}

/**
 * Get maximum content size for different endpoints
 */
function getMaxContentSize(pathname: string): number {
  // Image upload endpoints
  if (pathname.includes('/images') || pathname.includes('/upload')) {
    return 10 * 1024 * 1024; // 10MB for images
  }
  
  // Profile endpoints
  if (pathname.includes('/profile')) {
    return 50 * 1024; // 50KB for profile data
  }
  
  // Contact form
  if (pathname.includes('/contact')) {
    return 10 * 1024; // 10KB for contact messages
  }
  
  // Chat/AI endpoints
  if (pathname.includes('/chat') || pathname.includes('/gemini')) {
    return 5 * 1024; // 5KB for chat messages
  }
  
  // Default limit
  return 1 * 1024 * 1024; // 1MB default
}

/**
 * Extract user ID from JWT token (simplified version)
 */
function extractUserIdFromToken(token: string): string | null {
  try {
    const [, payloadPart] = token.split('.');
    if (!payloadPart) return null;
    
    const padded = payloadPart
      .padEnd(payloadPart.length + ((4 - (payloadPart.length % 4)) % 4), '=')
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const json = Buffer.from(padded, 'base64').toString('utf-8');
    const payload = JSON.parse(json);
    
    return payload.sub || payload.userId || null;
  } catch {
    return null;
  }
}

/**
 * Middleware to add security headers to all responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  return applySecurityHeaders(response) as NextResponse;
}

/**
 * Content Security Policy for different types of responses
 */
export function getCSPHeader(pathname: string): string {
  // API endpoints
  if (pathname.startsWith('/api/')) {
    return "default-src 'none'; frame-ancestors 'none';";
  }
  
  // File upload endpoints
  if (pathname.includes('/upload') || pathname.includes('/images')) {
    return "default-src 'self'; img-src 'self' data: blob:; frame-ancestors 'none';";
  }
  
  // Default CSP for web pages
  return "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none';";
}

/**
 * Input sanitization middleware
 */
export async function sanitizeRequestBody(request: NextRequest): Promise<any> {
  if (!['POST', 'PUT', 'PATCH'].includes(request.method)) {
    return null;
  }

  try {
    const body = await request.json();
    return sanitizeObject(body);
  } catch {
    // Not JSON or already consumed
    return null;
  }
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Sanitize string input
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;
  
  return str
    .trim()
    .replace(/[<>'"&\0]/g, '') // Remove potentially dangerous characters
    .substring(0, 10000); // Limit length
}