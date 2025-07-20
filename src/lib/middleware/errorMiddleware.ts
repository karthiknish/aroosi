/**
 * Global error handling middleware for API routes
 */

import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiResponse";
import { createAppError, logError, ErrorType } from "@/lib/utils/errorHandling";

// Error types that should not be logged as errors (expected errors)
const EXPECTED_ERROR_TYPES = [
  ErrorType.VALIDATION,
  ErrorType.NOT_FOUND,
  ErrorType.AUTHENTICATION,
  ErrorType.PERMISSION,
];

// Rate limiting errors
const RATE_LIMIT_ERRORS = [
  "Rate limit exceeded",
  "Too many requests",
  "Quota exceeded",
];

// Database connection errors
const DB_CONNECTION_ERRORS = [
  "Connection refused",
  "Connection timeout",
  "Database unavailable",
  "Connection lost",
];

// External service errors
const EXTERNAL_SERVICE_ERRORS = [
  "Service unavailable",
  "External API error",
  "Third-party service error",
  "Upstream error",
];

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, unknown>;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && "statusCode" in error;
}

export function createApiError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: Record<string, unknown>
): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

export function getErrorStatusCode(error: unknown): number {
  if (isApiError(error) && error.statusCode) {
    return error.statusCode;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Authentication errors
    if (
      message.includes("unauthorized") ||
      message.includes("invalid token") ||
      message.includes("token expired")
    ) {
      return 401;
    }

    // Permission errors
    if (
      message.includes("forbidden") ||
      message.includes("permission denied") ||
      message.includes("access denied")
    ) {
      return 403;
    }

    // Not found errors
    if (message.includes("not found") || message.includes("does not exist")) {
      return 404;
    }

    // Validation errors
    if (
      message.includes("validation") ||
      message.includes("invalid") ||
      message.includes("required")
    ) {
      return 400;
    }

    // Rate limiting errors
    if (
      RATE_LIMIT_ERRORS.some((rateLimitError) =>
        message.includes(rateLimitError.toLowerCase())
      )
    ) {
      return 429;
    }

    // Database errors
    if (
      DB_CONNECTION_ERRORS.some((dbError) =>
        message.includes(dbError.toLowerCase())
      )
    ) {
      return 503;
    }

    // External service errors
    if (
      EXTERNAL_SERVICE_ERRORS.some((serviceError) =>
        message.includes(serviceError.toLowerCase())
      )
    ) {
      return 502;
    }
  }

  // Default to 500 for unknown errors
  return 500;
}

export function getErrorMessage(
  error: unknown,
  includeDetails: boolean = false
): string {
  if (isApiError(error)) {
    return includeDetails && error.details
      ? `${error.message} (${JSON.stringify(error.details)})`
      : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function shouldLogError(error: unknown, statusCode: number): boolean {
  // Don't log client errors (4xx) except for authentication issues
  if (statusCode >= 400 && statusCode < 500 && statusCode !== 401) {
    return false;
  }

  // Don't log expected error types
  const appError = createAppError(error);
  if (EXPECTED_ERROR_TYPES.includes(appError.type)) {
    return false;
  }

  return true;
}

export function sanitizeErrorForClient(
  error: unknown,
  isDevelopment: boolean = false
): string {
  const statusCode = getErrorStatusCode(error);

  // In development, show detailed error messages
  if (isDevelopment) {
    return getErrorMessage(error, true);
  }

  // In production, show generic messages for server errors
  if (statusCode >= 500) {
    return "Internal server error. Please try again later.";
  }

  // For client errors, show the actual message (it's safe)
  return getErrorMessage(error);
}

export function handleApiError(
  error: unknown,
  request?: NextRequest,
  context?: Record<string, unknown>
): NextResponse {
  const statusCode = getErrorStatusCode(error);
  const isDevelopment = process.env.NODE_ENV === "development";

  // Create structured error for logging
  const appError = createAppError(error, {
    ...context,
    url: request?.url,
    method: request?.method,
    userAgent: request?.headers.get("user-agent"),
    ip: (request as any)?.ip || request?.headers.get("x-forwarded-for"),
  });

  // Log error if it should be logged
  if (shouldLogError(error, statusCode)) {
    logError(appError);
  }

  // Get sanitized error message for client
  const clientMessage = sanitizeErrorForClient(error, isDevelopment);

  // Return appropriate error response
  return NextResponse.json(
    { success: false, error: clientMessage },
    { status: statusCode }
  );
}

// Wrapper for API route handlers with error handling
export function withErrorHandling<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return handleApiError(error, request, {
        handler: handler.name,
        timestamp: new Date().toISOString(),
      });
    }
  };
}

// Async wrapper with timeout
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  timeoutMessage: string = "Operation timed out"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(createApiError(timeoutMessage, 408, "TIMEOUT"));
      }, timeoutMs);
    }),
  ]);
}

// Database operation wrapper with retry logic
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Don't retry client errors
      const statusCode = getErrorStatusCode(error);
      if (statusCode >= 400 && statusCode < 500) {
        break;
      }

      // Wait before retrying with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));

      console.warn(
        `Database operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})...`
      );
    }
  }

  throw lastError;
}

// External API call wrapper with retry logic
export async function withExternalApiRetry<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Don't retry client errors or authentication errors
      const statusCode = getErrorStatusCode(error);
      if (
        (statusCode >= 400 && statusCode < 500) ||
        statusCode === 401 ||
        statusCode === 403
      ) {
        break;
      }

      // Wait before retrying
      const delay = baseDelay * Math.pow(1.5, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));

      console.warn(
        `External API call failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})...`
      );
    }
  }

  throw lastError;
}

// Validation wrapper
export function withValidation<T>(
  data: unknown,
  validator: (data: unknown) => T,
  fieldName?: string
): T {
  try {
    return validator(data);
  } catch (error) {
    const message = fieldName
      ? `Validation failed for ${fieldName}: ${getErrorMessage(error)}`
      : `Validation failed: ${getErrorMessage(error)}`;

    throw createApiError(message, 400, "VALIDATION_ERROR", {
      field: fieldName,
      originalError: getErrorMessage(error),
    });
  }
}

// Request body parser with error handling
export async function parseRequestBody<T = unknown>(
  request: NextRequest,
  validator?: (data: unknown) => T
): Promise<T> {
  try {
    const body = await request.json();

    if (validator) {
      return withValidation(body, validator, "request body");
    }

    return body as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw createApiError("Invalid JSON in request body", 400, "INVALID_JSON");
    }

    throw error;
  }
}
