/**
 * Robust API Handler Utilities for Next.js
 * Provides standardized error handling, validation, rate limiting, and security
 * 
 * This is the CANONICAL source for API utilities. Other files should re-export from here.
 */

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError, ZodSchema } from "zod";
import { requireAuth, AuthError, AuthPayload } from "@/lib/auth/requireAuth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import {
  applySecurityHeaders,
  validateSecurityRequirements,
  SECURITY_HEADERS,
} from "@/lib/utils/securityHeaders";

// ============================================================================
// Normalized User Type (Unified across all auth patterns)
// ============================================================================

/**
 * Normalized user object that provides consistent property names across all auth patterns.
 * All three ID properties (id, uid, userId) are always available and identical.
 */
export interface NormalizedUser {
  /** Canonical user ID */
  id: string;
  /** Alias for Firebase compatibility */
  uid: string;
  /** Alias for legacy compatibility */
  userId: string;
  /** User email (null if not available) */
  email: string | null;
  /** User role */
  role: string;
  /** Whether user is admin */
  isAdmin: boolean;
  /** Whether user profile is complete */
  isProfileComplete: boolean;
  /** Whether user is banned */
  banned: boolean;
}

/**
 * Normalizes various user object shapes into a consistent NormalizedUser.
 * Handles AuthPayload, AuthenticatedUser, and raw Firebase decoded tokens.
 */
export function normalizeUser(user: unknown): NormalizedUser {
  if (!user || typeof user !== "object") {
    throw new Error("Invalid user object");
  }
  
  const u = user as Record<string, unknown>;
  
  // Extract ID from various possible property names
  const id = String(u.userId ?? u.uid ?? u.id ?? "");
  if (!id) {
    throw new Error("User object missing ID");
  }
  
  const email = (u.email as string) || null;
  const role = (u.role as string) || "user";
  const isAdmin = role === "admin" || u.isAdmin === true;
  const isProfileComplete = u.isProfileComplete === true;
  
  return {
    id,
    uid: id,
    userId: id,
    email,
    role,
    isAdmin,
    isProfileComplete,
    banned: u.banned === true,
  };
}

// ============================================================================
// Error Classes (Consolidated)
// ============================================================================

export enum ErrorCode {
  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_REQUEST = "INVALID_REQUEST",
  MISSING_FIELDS = "MISSING_FIELDS",
  INVALID_FORMAT = "INVALID_FORMAT",
  
  // Auth
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  TOKEN_INVALID = "TOKEN_INVALID",
  UNAUTHENTICATED = "UNAUTHENTICATED",
  
  // Resources
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  
  // Server
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  NETWORK_ERROR = "NETWORK_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode | string;
  public readonly details?: Record<string, unknown>;
  public readonly correlationId?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode | string = ErrorCode.INTERNAL_ERROR,
    details?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.correlationId = correlationId;
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>, correlationId?: string) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, details, correlationId);
    this.name = "ValidationError";
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = "Unauthorized", code: ErrorCode | string = ErrorCode.UNAUTHORIZED, correlationId?: string) {
    super(message, code === ErrorCode.FORBIDDEN ? 403 : 401, code, undefined, correlationId);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = "Resource", correlationId?: string) {
    super(`${resource} not found`, 404, ErrorCode.NOT_FOUND, undefined, correlationId);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter?: number, correlationId?: string) {
    super("Rate limit exceeded", 429, ErrorCode.RATE_LIMIT_EXCEEDED, 
      retryAfter ? { retryAfter } : undefined, correlationId);
    this.name = "RateLimitError";
  }
}

export class DatabaseError extends ApiError {
  constructor(message: string = "Database operation failed", correlationId?: string) {
    super(message, 500, ErrorCode.DATABASE_ERROR, undefined, correlationId);
    this.name = "DatabaseError";
  }
}

// ============================================================================
// Types
// ============================================================================

export interface ApiContext {
  correlationId: string;
  startTime: number;
  user?: NormalizedUser;
  request: NextRequest;
  /** Next.js dynamic route context (contains params) */
  nextCtx?: any;
}


export interface AuthenticatedApiContext extends ApiContext {
  user: NormalizedUser;
}


export interface RateLimitConfig {
  /** Unique identifier prefix (will be combined with user ID if authenticated) */
  identifier: string;
  /** Maximum requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number;
  /** Custom function to resolve the rate limit identifier */
  getIdentifier?: (ctx: ApiContext, body?: any) => string;
  /** Custom error message when rate limit is exceeded */
  message?: string;
}

export interface ApiHandlerOptions<TBody = unknown> {
  /** Zod schema for request body validation (POST/PUT/PATCH) */
  bodySchema?: ZodSchema<TBody>;
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig | RateLimitConfig[];
  /** Whether to require authentication */
  requireAuth?: boolean;
  /** Whether to validate security requirements (headers, origin, etc.) */
  validateSecurity?: boolean;
  /** Whether to allow banned users (default: false) */
  allowBanned?: boolean;
  /** Custom error handler */
  onError?: (error: unknown, ctx: ApiContext) => Response | Promise<Response>;
}

export type ApiHandler<TBody = unknown> = (
  ctx: ApiContext,
  body: TBody
) => Response | Promise<Response>;

export type AuthenticatedApiHandler<TBody = unknown> = (
  ctx: AuthenticatedApiContext,
  body: TBody
) => Response | Promise<Response>;


// ============================================================================
// Response Helpers
// ============================================================================

export function generateCorrelationId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

export function jsonResponse<T>(
  data: T,
  status = 200,
  extraHeaders?: Record<string, string>
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

export function successResponse<T = unknown>(
  data?: T,
  status = 200,
  correlationId?: string,
  metadata?: Record<string, unknown>
): NextResponse {
  const payload: Record<string, unknown> = { 
    success: true,
    data: data !== undefined ? data : null,
  };
  
  if (correlationId) payload.correlationId = correlationId;
  if (metadata) payload.metadata = metadata;
  
  return jsonResponse(payload, status);
}


export function errorResponse(
  message: string,
  status = 400,
  options: { 
    correlationId?: string; 
    code?: string; 
    details?: Record<string, unknown> 
  } = {}
): NextResponse {
  const correlationId = options.correlationId ?? generateCorrelationId();
  const { code, details } = options;
  const isDev = process.env.NODE_ENV === "development";
  
  const payload: Record<string, unknown> = {
    success: false,
    error: isDev ? message : sanitizeErrorMessage(message, status),
    correlationId,
  };
  
  if (code) payload.code = code;
  if (details) payload.details = details;

  const res = jsonResponse(payload, status);
  res.headers.set("x-correlation-id", correlationId);
  return res;
}


/**
 * Public variant: always expose the provided message (for user-friendly errors).
 * Use this when you have a deliberately crafted user-facing message that should
 * not be sanitized away in production.
 */
export function errorResponsePublic(
  message: string,
  status = 400,
  options: { 
    correlationId?: string; 
    code?: string; 
    details?: Record<string, unknown> 
  } = {}
): NextResponse {
  const correlationId = options.correlationId ?? generateCorrelationId();
  const { code, details } = options;
  
  const payload: Record<string, unknown> = {
    success: false,
    error: message,
    correlationId,
  };
  
  if (code) payload.code = code;
  if (details) payload.details = details;

  const res = jsonResponse(payload, status);
  res.headers.set("x-correlation-id", correlationId);
  return res;
}

function withCorrelationHeader(response: Response, correlationId: string): Response {
  try {
    response.headers.set("x-correlation-id", correlationId);
    return response;
  } catch {
    // Best-effort fallback. Avoid cloning body streams unless necessary.
    const headers = new Headers(response.headers);
    headers.set("x-correlation-id", correlationId);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}


function sanitizeErrorMessage(message: string, status: number): string {
  // For server errors, don't expose internal details
  if (status >= 500) return "Internal server error";
  // For client errors, provide generic messages for security
  const genericMessages: Record<number, string> = {
    400: "Bad request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not found",
    409: "Conflict",
    422: "Validation failed",
    429: "Too many requests",
  };
  return genericMessages[status] || message;
}

// ============================================================================
// Validation Helpers
// ============================================================================

export function validateBody<T>(
  body: unknown,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; errors: z.ZodIssue[] } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}

export async function parseRequestBody(
  request: NextRequest
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return { success: false, error: "Content-Type must be application/json" };
    }
    const body = await request.json();
    return { success: true, data: body };
  } catch (e) {
    return { success: false, error: "Invalid JSON body" };
  }
}

// ============================================================================
// Rate Limiting Helpers
// ============================================================================

export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  return checkApiRateLimit(identifier, maxRequests, windowMs);
}

// ============================================================================
// Main Handler Wrapper
// ============================================================================

/**
 * Creates a robust API handler with built-in:
 * - Request validation
 * - Rate limiting
 * - Security headers
 * - Error handling
 * - Correlation IDs
 * - Authentication (optional)
 */
export function createApiHandler<TBody = unknown>(
  handler: ApiHandler<TBody>,
  options: ApiHandlerOptions<TBody> = {}
) {
  return async (request: NextRequest, nextCtx?: any): Promise<Response> => {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();
    const ctx: ApiContext = {
      correlationId,
      startTime,
      request,
      nextCtx,
    };


    try {
      // 1. Security validation
      if (options.validateSecurity !== false) {
        const securityCheck = validateSecurityRequirements(
          request as unknown as Request
        );
        if (!securityCheck.valid) {
          return applySecurityHeaders(
            errorResponse(securityCheck.error || "Invalid request", 400, {
              correlationId,
            })
          );
        }
      }

      // 2. Authentication (Required or Optional)
      try {
        // Always attempt to authenticate if a token/cookie is present
        const auth = await requireAuth(request);
        ctx.user = normalizeUser(auth);

        // 2.1 Banned user check: Block access if user is banned and allowBanned is not true
        if (ctx.user.banned && options.allowBanned !== true) {
          return applySecurityHeaders(
            errorResponse("Account is banned", 403, {
              correlationId,
              code: ErrorCode.FORBIDDEN,
            })
          );
        }
      } catch (e) {
        // If authentication is required, we must fail
        if (options.requireAuth) {
          if (e instanceof AuthError) {
            return applySecurityHeaders(
              errorResponse(e.message, e.status, {
                correlationId,
                code: e.code,
              })
            );
          }
          throw e;
        }
        // If not required, we silently ignore auth failures (e.g. missing token or invalid token)
        // and proceed with an unauthenticated context.
      }

      // 3. Rate limiting (Pre-body checks)
      const rateLimits = Array.isArray(options.rateLimit)
        ? options.rateLimit
        : options.rateLimit
        ? [options.rateLimit]
        : [];

      const clientIp =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "anonymous";

      for (const rlConfig of rateLimits) {
        if (!rlConfig.getIdentifier) {
          const identifier = ctx.user
            ? `${rlConfig.identifier}_${ctx.user.id}`
            : `${rlConfig.identifier}_${clientIp}`;
          const rl = checkRateLimit(
            identifier,
            rlConfig.maxRequests,
            rlConfig.windowMs
          );
          if (!rl.allowed) {
            return applySecurityHeaders(
              errorResponse(rlConfig.message || "Rate limit exceeded", 429, {
                correlationId,
                details: {
                  retryAfter: Math.ceil((rl.resetTime - Date.now()) / 1000),
                },
              })
            );
          }
        }
      }

      // 4. Body parsing and validation (for POST/PUT/PATCH)
      let body: TBody = undefined as TBody;
      const needsBody = !!(
        options.bodySchema || rateLimits.some((rl) => rl.getIdentifier)
      );

      if (needsBody && ["POST", "PUT", "PATCH"].includes(request.method)) {
        const parseResult = await parseRequestBody(request);
        if (!parseResult.success) {
          return applySecurityHeaders(
            errorResponse(parseResult.error, 400, { correlationId })
          );
        }

        if (options.bodySchema) {
          const validationResult = validateBody(
            parseResult.data,
            options.bodySchema
          );
          if (!validationResult.success) {
            return applySecurityHeaders(
              errorResponse("Validation failed", 422, {
                correlationId,
                details: {
                  errors: validationResult.errors.map((e) => ({
                    path: e.path.join("."),
                    message: e.message,
                  })),
                },
              })
            );
          }
          body = validationResult.data;
        } else {
          body = parseResult.data as TBody;
        }

        // 5. Rate limiting (Post-body checks)
        for (const rlConfig of rateLimits) {
          if (rlConfig.getIdentifier) {
            const identifier = rlConfig.getIdentifier(ctx, body);
            const rl = checkRateLimit(
              identifier,
              rlConfig.maxRequests,
              rlConfig.windowMs
            );
            if (!rl.allowed) {
              return applySecurityHeaders(
                errorResponse(rlConfig.message || "Rate limit exceeded", 429, {
                  correlationId,
                  details: {
                    retryAfter: Math.ceil((rl.resetTime - Date.now()) / 1000),
                  },
                })
              );
            }
          }
        }
      }

      // 5. Execute handler
      const response = await handler(ctx, body);
      return applySecurityHeaders(withCorrelationHeader(response, correlationId));
    } catch (error) {
      // Custom error handler
      if (options.onError) {
        return applySecurityHeaders(
          withCorrelationHeader(await options.onError(error, ctx), correlationId)
        );
      }

      // Handle known error types
      if (error instanceof ApiError) {
        return applySecurityHeaders(
          errorResponse(error.message, error.statusCode, {
            correlationId,
            code: error.code,
            details: error.details,
          })
        );
      }

      // Handle Zod validation errors
      if (error instanceof ZodError) {
        return applySecurityHeaders(
          errorResponse("Validation failed", 422, {
            correlationId,
            details: {
              errors: error.issues.map((e) => ({
                path: e.path.join("."),
                message: e.message,
              })),
            },
          })
        );
      }

      // Handle auth errors
      if (error instanceof AuthError) {
        return applySecurityHeaders(
          errorResponse(error.message, error.status, {
            correlationId,
            code: error.code,
          })
        );
      }

      // Log unexpected errors
      console.error(`[API Error] ${correlationId}:`, error);

      // Generic error response
      const message = error instanceof Error ? error.message : "Unknown error";
      return applySecurityHeaders(
        errorResponse(message, 500, { correlationId })
      );
    }
  };
}

/**
 * Creates an authenticated API handler (convenience wrapper)
 */
export function createAuthenticatedHandler<TBody = unknown>(
  handler: AuthenticatedApiHandler<TBody>,
  options: Omit<ApiHandlerOptions<TBody>, "requireAuth"> = {}
) {
  return createApiHandler(handler as ApiHandler<TBody>, { ...options, requireAuth: true });
}

// ============================================================================
// Common Validation Schemas
// ============================================================================

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  cursor: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export const userIdParamSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const timestampSchema = z.coerce.number().int().min(0);

export const emailSchema = z.string().email("Invalid email address");

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number");

// ============================================================================
// Query Parameter Helpers
// ============================================================================

export function getQueryParams(
  request: NextRequest
): Record<string, string | null> {
  const params: Record<string, string | null> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export function validateQueryParams<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; errors: z.ZodIssue[] } {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  return validateBody(params, schema);
}

// ============================================================================
// Re-exports for backward compatibility
// ============================================================================

// Re-export AuthError from requireAuth for routes that catch it directly
export { AuthError } from "@/lib/auth/requireAuth";
