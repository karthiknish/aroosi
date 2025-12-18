/**
 * Robust API Handler Utilities for Next.js 16
 * Provides standardized error handling, validation, rate limiting, and security
 */

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError, ZodSchema } from "zod";
import { withFirebaseAuth, AuthenticatedUser } from "@/lib/auth/firebaseAuth";
import { requireAuth, AuthError, AuthPayload } from "@/lib/auth/requireAuth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import {
  applySecurityHeaders,
  validateSecurityRequirements,
  SECURITY_HEADERS,
} from "@/lib/utils/securityHeaders";

// ============================================================================
// Types
// ============================================================================

export interface ApiContext {
  correlationId: string;
  startTime: number;
  user?: AuthenticatedUser | AuthPayload;
  request: NextRequest;
}

export interface ApiHandlerOptions<TBody = unknown> {
  /** Zod schema for request body validation (POST/PUT/PATCH) */
  bodySchema?: ZodSchema<TBody>;
  /** Rate limiting configuration */
  rateLimit?: {
    /** Unique identifier prefix (will be combined with user ID if authenticated) */
    identifier: string;
    /** Maximum requests allowed in the time window */
    maxRequests: number;
    /** Time window in milliseconds (default: 60000 = 1 minute) */
    windowMs?: number;
  };
  /** Whether to require authentication */
  requireAuth?: boolean;
  /** Whether to validate security requirements (headers, origin, etc.) */
  validateSecurity?: boolean;
  /** Custom error handler */
  onError?: (error: unknown, ctx: ApiContext) => Response | Promise<Response>;
}

export type ApiHandler<TBody = unknown> = (
  ctx: ApiContext,
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
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

export function successResponse<T = unknown>(
  data?: T,
  status = 200,
  correlationId?: string
): Response {
  const payload: Record<string, unknown> = { success: true };
  if (data !== undefined) payload.data = data;
  if (correlationId) payload.correlationId = correlationId;
  return jsonResponse(payload, status);
}

export function errorResponse(
  message: string,
  status = 400,
  extra?: Record<string, unknown>
): Response {
  const isDev = process.env.NODE_ENV === "development";
  const payload = {
    success: false,
    error: isDev ? message : sanitizeErrorMessage(message, status),
    ...extra,
  };
  return jsonResponse(payload, status);
}

/**
 * Public variant: always expose the provided message (for user-friendly errors).
 * Use this when you have a deliberately crafted user-facing message that should
 * not be sanitized away in production.
 */
export function errorResponsePublic(
  message: string,
  status = 400,
  extra?: Record<string, unknown>
): Response {
  const payload = {
    success: false,
    error: message,
    ...extra,
  };
  return jsonResponse(payload, status);
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
  return async (request: NextRequest): Promise<Response> => {
    const correlationId = generateCorrelationId();
    const startTime = Date.now();
    const ctx: ApiContext = {
      correlationId,
      startTime,
      request,
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

      // 2. Authentication (if required)
      if (options.requireAuth) {
        try {
          const auth = await requireAuth(request);
          ctx.user = auth;
        } catch (e) {
          const authError = e as AuthError;
          return applySecurityHeaders(
            errorResponse(authError.message, authError.status, {
              correlationId,
              code: authError.code,
            })
          );
        }
      }

      // 3. Rate limiting
      if (options.rateLimit) {
        const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                         request.headers.get("x-real-ip") || 
                         "anonymous";
        const identifier = ctx.user
          ? `${options.rateLimit.identifier}_${(ctx.user as AuthPayload).userId || (ctx.user as AuthenticatedUser).id}`
          : `${options.rateLimit.identifier}_${clientIp}`;
        const rl = checkRateLimit(
          identifier,
          options.rateLimit.maxRequests,
          options.rateLimit.windowMs
        );
        if (!rl.allowed) {
          return applySecurityHeaders(
            errorResponse("Rate limit exceeded", 429, {
              correlationId,
              retryAfter: Math.ceil((rl.resetTime - Date.now()) / 1000),
            })
          );
        }
      }

      // 4. Body parsing and validation (for POST/PUT/PATCH)
      let body: TBody = undefined as TBody;
      if (
        options.bodySchema &&
        ["POST", "PUT", "PATCH"].includes(request.method)
      ) {
        const parseResult = await parseRequestBody(request);
        if (!parseResult.success) {
          return applySecurityHeaders(
            errorResponse(parseResult.error, 400, { correlationId })
          );
        }
        const validationResult = validateBody(parseResult.data, options.bodySchema);
        if (!validationResult.success) {
          return applySecurityHeaders(
            errorResponse("Validation failed", 422, {
              correlationId,
              errors: validationResult.errors.map((e) => ({
                path: e.path.join("."),
                message: e.message,
              })),
            })
          );
        }
        body = validationResult.data;
      }

      // 5. Execute handler
      const response = await handler(ctx, body);
      return applySecurityHeaders(response);
    } catch (error) {
      // Custom error handler
      if (options.onError) {
        return applySecurityHeaders(await options.onError(error, ctx));
      }

      // Default error handling
      console.error(`[API Error] ${correlationId}:`, error);
      
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        return applySecurityHeaders(
          errorResponse("Validation failed", 422, {
            correlationId,
            errors: error.issues.map((e) => ({
              path: e.path.join("."),
              message: e.message,
            })),
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
  handler: ApiHandler<TBody>,
  options: Omit<ApiHandlerOptions<TBody>, "requireAuth"> = {}
) {
  return createApiHandler(handler, { ...options, requireAuth: true });
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
