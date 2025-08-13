/**
 * Comprehensive error handling utilities for the application
 */

import { showErrorToast } from "@/lib/ui/toast";

// Error types for better categorization
export enum ErrorType {
  NETWORK = "NETWORK",
  AUTHENTICATION = "AUTHENTICATION",
  VALIDATION = "VALIDATION",
  PERMISSION = "PERMISSION",
  NOT_FOUND = "NOT_FOUND",
  SERVER = "SERVER",
  CLIENT = "CLIENT",
  UNKNOWN = "UNKNOWN",
}

// Error severity levels
export enum ErrorSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

// Structured error interface
export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: unknown;
  context?: Record<string, unknown>;
  timestamp: Date;
  userMessage?: string;
}

// Error classification based on common patterns
export function classifyError(error: unknown): ErrorType {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("connection")
    ) {
      return ErrorType.NETWORK;
    }

    if (
      message.includes("auth") ||
      message.includes("token") ||
      message.includes("unauthorized") ||
      message.includes("401")
    ) {
      return ErrorType.AUTHENTICATION;
    }

    if (
      message.includes("validation") ||
      message.includes("invalid") ||
      message.includes("400")
    ) {
      return ErrorType.VALIDATION;
    }

    if (
      message.includes("permission") ||
      message.includes("forbidden") ||
      message.includes("403")
    ) {
      return ErrorType.PERMISSION;
    }

    if (message.includes("not found") || message.includes("404")) {
      return ErrorType.NOT_FOUND;
    }

    if (
      message.includes("500") ||
      message.includes("server") ||
      message.includes("internal")
    ) {
      return ErrorType.SERVER;
    }
  }

  return ErrorType.UNKNOWN;
}

// Get user-friendly error messages
export function getUserFriendlyMessage(
  errorType: ErrorType,
  originalMessage?: string
): string {
  switch (errorType) {
    case ErrorType.NETWORK:
      return "Network error. Please check your connection and try again.";
    case ErrorType.AUTHENTICATION:
      return "Authentication failed. Please sign in again.";
    case ErrorType.VALIDATION:
      return originalMessage || "Please check your input and try again.";
    case ErrorType.PERMISSION:
      return "You don't have permission to perform this action.";
    case ErrorType.NOT_FOUND:
      return "The requested resource was not found.";
    case ErrorType.SERVER:
      return "Server error. Please try again later.";
    case ErrorType.CLIENT:
      return originalMessage || "Something went wrong. Please try again.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}

// Create structured error
export function createAppError(
  error: unknown,
  context?: Record<string, unknown>,
  userMessage?: string
): AppError {
  const errorType = classifyError(error);
  const severity = getSeverityForErrorType(errorType);
  const message = error instanceof Error ? error.message : String(error);

  return {
    type: errorType,
    severity,
    message,
    originalError: error,
    context,
    timestamp: new Date(),
    userMessage: userMessage || getUserFriendlyMessage(errorType, message),
  };
}

// Get severity based on error type
function getSeverityForErrorType(errorType: ErrorType): ErrorSeverity {
  switch (errorType) {
    case ErrorType.AUTHENTICATION:
    case ErrorType.SERVER:
      return ErrorSeverity.HIGH;
    case ErrorType.PERMISSION:
    case ErrorType.NOT_FOUND:
      return ErrorSeverity.MEDIUM;
    case ErrorType.VALIDATION:
    case ErrorType.CLIENT:
      return ErrorSeverity.LOW;
    case ErrorType.NETWORK:
      return ErrorSeverity.MEDIUM;
    default:
      return ErrorSeverity.MEDIUM;
  }
}

// Log error with appropriate level
export function logError(appError: AppError): void {
  const logData = {
    type: appError.type,
    severity: appError.severity,
    message: appError.message,
    context: appError.context,
    timestamp: appError.timestamp.toISOString(),
    stack:
      appError.originalError instanceof Error
        ? appError.originalError.stack
        : undefined,
  };

  switch (appError.severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      /* eslint-disable-next-line no-console */
      console.error("[ERROR]", logData);
      break;
    case ErrorSeverity.MEDIUM:
      /* eslint-disable-next-line no-console */
      console.warn("[WARNING]", logData);
      break;
    case ErrorSeverity.LOW:
      /* eslint-disable-next-line no-console */
      console.info("[INFO]", logData);
      break;
  }
}

// Handle error with logging and user notification
export function handleError(
  error: unknown,
  context?: Record<string, unknown>,
  options?: {
    showToast?: boolean;
    customUserMessage?: string;
    logError?: boolean;
  }
): AppError {
  const appError = createAppError(error, context, options?.customUserMessage);

  // Log error (default: true)
  if (options?.logError !== false) {
    logError(appError);
  }

  // Show toast notification (default: true)
  if (options?.showToast !== false) {
    showErrorToast(null, appError.userMessage);
  }

  return appError;
}

// Async error handler wrapper
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context?: Record<string, unknown>
) {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, { ...context, functionName: fn.name });
      return null;
    }
  };
}

// Sync error handler wrapper
export function withSyncErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => R,
  context?: Record<string, unknown>
) {
  return (...args: T): R | null => {
    try {
      return fn(...args);
    } catch (error) {
      handleError(error, { ...context, functionName: fn.name });
      return null;
    }
  };
}

// Retry mechanism with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    shouldRetry?: (error: unknown) => boolean;
  }
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry = (error: unknown) => {
      const errorType = classifyError(error);
      // Don't retry authentication, validation, or permission errors
      return ![
        ErrorType.AUTHENTICATION,
        ErrorType.VALIDATION,
        ErrorType.PERMISSION,
      ].includes(errorType);
    },
  } = options || {};

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt or if error shouldn't be retried
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );

      /* eslint-disable-next-line no-console */
      console.warn(
        `Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
        error
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Error boundary helper for React components
export function createErrorBoundaryHandler(componentName: string) {
  return (error: Error, errorInfo: { componentStack: string }) => {
    const appError = createAppError(error, {
      componentName,
      componentStack: errorInfo.componentStack,
    });

    logError(appError);

    // In development, also log to console for easier debugging
    if (process.env.NODE_ENV === "development") {
      /* eslint-disable-next-line no-console */
      console.error(`Error in ${componentName}:`, error);
      /* eslint-disable-next-line no-console */
      console.error("Component stack:", errorInfo.componentStack);
    }
  };
}

// Validation error helper
export function createValidationError(
  field: string,
  message: string,
  value?: unknown
): AppError {
  return createAppError(
    new Error(`Validation failed for ${field}: ${message}`),
    { field, value },
    message
  );
}

// Network error helper
export function createNetworkError(
  url: string,
  method: string,
  status?: number,
  statusText?: string
): AppError {
  const message = status
    ? `${method} ${url} failed with status ${status} ${statusText || ""}`
    : `${method} ${url} failed`;

  return createAppError(
    new Error(message),
    { url, method, status, statusText },
    "Network request failed. Please check your connection and try again."
  );
}

// Authentication error helper
export function createAuthError(
  message: string = "Authentication failed"
): AppError {
  return createAppError(
    new Error(message),
    { type: "authentication" },
    "Please sign in again to continue."
  );
}

// Permission error helper
export function createPermissionError(action: string): AppError {
  return createAppError(
    new Error(`Permission denied for action: ${action}`),
    { action },
    "You don't have permission to perform this action."
  );
}
