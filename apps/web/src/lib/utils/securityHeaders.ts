import { NextResponse } from "next/server";

/**
 * Security utilities for API responses and headers
 */

export const SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",

  // Prevent clickjacking
  "X-Frame-Options": "DENY",

  // XSS protection
  "X-XSS-Protection": "1; mode=block",

  // Referrer policy
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Content Security Policy for API responses
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none';",

  // Remove server info
  Server: "",

  // Cache control for sensitive endpoints
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

/**
 * Applies security headers to a Response object
 */
export function applySecurityHeaders(response: Response): Response {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Creates a secure Response with proper headers
 */
export function createSecureResponse(
  body: string | null,
  init?: ResponseInit
): NextResponse {
  const response = new NextResponse(body, {
    ...init,
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  return response;
}

/**
 * Rate limiting for API endpoints
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkApiRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const current = rateLimitMap.get(identifier);

  if (!current || now > current.resetTime) {
    // Reset or create new rate limit entry
    const resetTime = now + windowMs;
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }

  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }

  current.count++;
  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetTime: current.resetTime,
  };
}

/**
 * Input sanitization utilities
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/[<>'"&]/g, "") // Remove potential XSS characters
    .substring(0, 1000); // Limit length
}

/**
 * Validates and sanitizes user ID format
 */
export function sanitizeUserId(userId: unknown): string | null {
  if (typeof userId !== "string") {
    return null;
  }

  const sanitized = userId.trim();

  // Must be alphanumeric with possible underscores/hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
    return null;
  }

  // Length validation
  if (sanitized.length < 3 || sanitized.length > 50) {
    return null;
  }

  return sanitized;
}

/**
 * Validates request origin and referer
 */
export function validateRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Allow same-origin requests
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    "http://localhost:3000", // Development
    "https://localhost:3000", // Development with HTTPS
  ].filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    return true;
  }

  if (referer) {
    const refererUrl = new URL(referer);
    const allowedHosts = allowedOrigins
      .filter(Boolean)
      .map((url) => new URL(url as string).host);
    return allowedHosts.includes(refererUrl.host);
  }

  // Allow requests without origin/referer for API clients
  return true;
}

/**
 * Logs security events for monitoring
 */
export function logSecurityEvent(
  event:
    | "RATE_LIMIT_EXCEEDED"
    | "INVALID_TOKEN"
    | "UNAUTHORIZED_ACCESS"
    | "VALIDATION_FAILED",
  details: Record<string, unknown>,
  request?: Request
): void {
  const securityLog = {
    timestamp: new Date().toISOString(),
    event,
    details,
    ip:
      request?.headers.get("x-forwarded-for") ||
      request?.headers.get("x-real-ip") ||
      "unknown",
    userAgent: request?.headers.get("user-agent") || "unknown",
    url: request?.url || "unknown",
  };

  // In production, send to security monitoring service
  if (process.env.NODE_ENV === "production") {
    // TODO: Integrate with security monitoring service
    console.warn("[SECURITY]", JSON.stringify(securityLog));
  } else {
    console.warn("[SECURITY]", securityLog);
  }
}

/**
 * Creates error responses with security considerations
 */
export function createSecureErrorResponse(
  message: string,
  status: number = 400,
  details?: Record<string, unknown>
): NextResponse {
  const errorBody = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    // Only include details in development
    ...(process.env.NODE_ENV === "development" && details ? { details } : {}),
  };

  return createSecureResponse(JSON.stringify(errorBody), { status });
}

/**
 * Middleware to validate common security requirements
 */
export function validateSecurityRequirements(request: Request): {
  valid: boolean;
  error?: string;
} {
  // Check content type for POST/PUT requests
  if (["POST", "PUT", "PATCH"].includes(request.method)) {
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return { valid: false, error: "Invalid content type" };
    }
  }

  // Validate request origin
  if (!validateRequestOrigin(request)) {
    return { valid: false, error: "Invalid request origin" };
  }

  // Check for suspicious headers
  const suspiciousHeaders = [
    "x-forwarded-host",
    "x-original-url",
    "x-rewrite-url",
  ];
  for (const header of suspiciousHeaders) {
    if (request.headers.get(header)) {
      logSecurityEvent(
        "VALIDATION_FAILED",
        { reason: `Suspicious header: ${header}` },
        request
      );
      return { valid: false, error: "Suspicious request headers" };
    }
  }

  return { valid: true };
}
