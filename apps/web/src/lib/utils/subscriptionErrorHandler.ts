/**
 * Unified Subscription Error Handler for Aroosi Web and Mobile
 * Provides consistent error handling across both platforms.
 * Clean, consolidated version with:
 *  - Existing enum/messages API retained
 *  - Single fromFetchResponse(res, context?) method
 *  - Single parseApiError(res, context?) helper
 */

export enum SubscriptionErrorType {
  // Network/Server errors
  NETWORK_ERROR = "NETWORK_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",

  // Payment/Subscription errors
  PAYMENT_FAILED = "PAYMENT_FAILED",
  SUBSCRIPTION_NOT_FOUND = "SUBSCRIPTION_NOT_FOUND",
  SUBSCRIPTION_EXPIRED = "SUBSCRIPTION_EXPIRED",
  SUBSCRIPTION_CANCELLED = "SUBSCRIPTION_CANCELLED",
  SUBSCRIPTION_ALREADY_ACTIVE = "SUBSCRIPTION_ALREADY_ACTIVE",

  // Platform-specific errors
  PLATFORM_NOT_SUPPORTED = "PLATFORM_NOT_SUPPORTED",
  STORE_UNAVAILABLE = "STORE_UNAVAILABLE",
  PURCHASE_CANCELLED = "PURCHASE_CANCELLED",
  PURCHASE_ALREADY_OWNED = "PURCHASE_ALREADY_OWNED",
  PURCHASE_NOT_ALLOWED = "PURCHASE_NOT_ALLOWED",

  // Validation errors
  INVALID_PLAN = "INVALID_PLAN",
  INVALID_TOKEN = "INVALID_TOKEN",
  INVALID_RECEIPT = "INVALID_RECEIPT",

  // User errors
  USER_NOT_AUTHENTICATED = "USER_NOT_AUTHENTICATED",
  INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",

  // Generic errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",

  // Generic API codes commonly returned by endpoints
  RATE_LIMITED = "RATE_LIMITED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
}

export interface SubscriptionError {
  type: SubscriptionErrorType;
  message: string;
  code?: string;
  details?: any;
  retryable?: boolean;
  userAction?: string;
}

/**
 * Backward-compatible "handle" helper expected by tests and some callers.
 * Accepts unknown errors (Error, Response, plain objects) and optional context,
 * and returns a normalized SubscriptionError for UI consumption.
 */
export function handle(
  error: unknown,
  context?: string
): SubscriptionError {
  // If already normalized, just return
  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    "message" in error
  ) {
    const e = error as SubscriptionError;
    return context
      ? { ...e, details: { ...(e.details || {}), context } }
      : e;
  }

  // If it's a Fetch Response that failed, map via the parser
  if (typeof Response !== "undefined" && error instanceof Response) {
    // This path is sync in signature but needs async parsing;
    // Fall back to a best-effort mapping using status and generic message.
    // Callers that have a Response should prefer parseApiError/fromFetchResponse.
    const mapped = SubscriptionErrorHandler.fromHttpResponse(error.status);
    return context
      ? { ...mapped, details: { ...(mapped.details || {}), context } }
      : mapped;
  }

  // Generic Error
  if (error instanceof Error) {
    const message = error.message || "An unexpected error occurred.";
    return {
      type: SubscriptionErrorType.UNKNOWN_ERROR,
      message,
      details: context ? { context } : undefined,
      retryable: true,
    };
  }

  // Fallback unknown
  return {
    type: SubscriptionErrorType.UNKNOWN_ERROR,
    message: "An unexpected error occurred.",
    details: context ? { context } : undefined,
    retryable: true,
  };
}

export class SubscriptionErrorHandler {
  private static readonly ERROR_MESSAGES: Record<
    SubscriptionErrorType,
    {
      userMessage: string;
      retryable: boolean;
      userAction?: string;
    }
  > = {
    [SubscriptionErrorType.NETWORK_ERROR]: {
      userMessage:
        "Network connection error. Please check your internet connection and try again.",
      retryable: true,
    },
    [SubscriptionErrorType.SERVER_ERROR]: {
      userMessage: "Server error occurred. Please try again later.",
      retryable: true,
    },
    [SubscriptionErrorType.TIMEOUT_ERROR]: {
      userMessage: "Request timed out. Please try again.",
      retryable: true,
    },
    [SubscriptionErrorType.PAYMENT_FAILED]: {
      userMessage:
        "Payment failed. Please check your payment method and try again.",
      retryable: true,
      userAction: "Update payment method",
    },
    [SubscriptionErrorType.SUBSCRIPTION_NOT_FOUND]: {
      userMessage: "Subscription not found. Please contact support.",
      retryable: false,
      userAction: "Contact support",
    },
    [SubscriptionErrorType.SUBSCRIPTION_EXPIRED]: {
      userMessage:
        "Your subscription has expired. Please renew to continue using premium features.",
      retryable: false,
      userAction: "Renew subscription",
    },
    [SubscriptionErrorType.SUBSCRIPTION_CANCELLED]: {
      userMessage:
        "Your subscription has been cancelled. You'll lose access at the end of your billing period.",
      retryable: false,
    },
    [SubscriptionErrorType.SUBSCRIPTION_ALREADY_ACTIVE]: {
      userMessage: "You already have an active subscription.",
      retryable: false,
    },
    [SubscriptionErrorType.PLATFORM_NOT_SUPPORTED]: {
      userMessage: "Subscriptions are not supported on this platform.",
      retryable: false,
    },
    [SubscriptionErrorType.STORE_UNAVAILABLE]: {
      userMessage:
        "App Store/Google Play is currently unavailable. Please try again later.",
      retryable: true,
    },
    [SubscriptionErrorType.PURCHASE_CANCELLED]: {
      userMessage: "Purchase was cancelled.",
      retryable: false,
    },
    [SubscriptionErrorType.PURCHASE_ALREADY_OWNED]: {
      userMessage: "You already own this subscription.",
      retryable: false,
    },
    [SubscriptionErrorType.PURCHASE_NOT_ALLOWED]: {
      userMessage:
        "Purchases are not allowed. Please check your device settings.",
      retryable: false,
    },
    [SubscriptionErrorType.INVALID_PLAN]: {
      userMessage: "Invalid subscription plan selected.",
      retryable: false,
    },
    [SubscriptionErrorType.INVALID_TOKEN]: {
      userMessage: "Authentication error. Please sign in again.",
      retryable: false,
      userAction: "Sign in",
    },
    [SubscriptionErrorType.INVALID_RECEIPT]: {
      userMessage: "Invalid purchase receipt. Please contact support.",
      retryable: false,
      userAction: "Contact support",
    },
    [SubscriptionErrorType.USER_NOT_AUTHENTICATED]: {
      userMessage: "Please sign in to manage your subscription.",
      retryable: false,
      userAction: "Sign in",
    },
    [SubscriptionErrorType.INSUFFICIENT_PERMISSIONS]: {
      userMessage: "You don't have permission to perform this action.",
      retryable: false,
    },
    [SubscriptionErrorType.UNKNOWN_ERROR]: {
      userMessage: "An unexpected error occurred. Please try again.",
      retryable: true,
    },
    [SubscriptionErrorType.RATE_LIMITED]: {
      userMessage: "You’re refreshing too quickly. Try again in a bit.",
      retryable: true,
    },
    [SubscriptionErrorType.FORBIDDEN]: {
      userMessage: "Action not allowed for your account.",
      retryable: false,
    },
    [SubscriptionErrorType.NOT_FOUND]: {
      userMessage: "The requested resource was not found.",
      retryable: false,
    },
  };

  static toUserMessage(error: SubscriptionError): string {
    const config =
      SubscriptionErrorHandler.ERROR_MESSAGES[error.type] ||
      SubscriptionErrorHandler.ERROR_MESSAGES[SubscriptionErrorType.UNKNOWN_ERROR];
    return config.userMessage;
  }

  static parseErrorCode(code?: string): SubscriptionErrorType {
    if (!code) return SubscriptionErrorType.UNKNOWN_ERROR;
    const normalized = code.toUpperCase();
    switch (normalized) {
      case "RATE_LIMITED":
      case "TOO_MANY_REQUESTS":
        return SubscriptionErrorType.RATE_LIMITED;
      case "UNAUTHORIZED":
      case "AUTH_REQUIRED":
        return SubscriptionErrorType.USER_NOT_AUTHENTICATED;
      case "VALIDATION_ERROR":
      case "BAD_REQUEST":
        return SubscriptionErrorType.INVALID_PLAN;
      case "NOT_FOUND":
        return SubscriptionErrorType.NOT_FOUND;
      case "FORBIDDEN":
      case "BLOCKED":
        return SubscriptionErrorType.FORBIDDEN;
      default:
        return SubscriptionErrorType.UNKNOWN_ERROR;
    }
  }

  static fromHttpResponse(
    status: number,
    body?: { code?: string; error?: string; message?: string }
  ): SubscriptionError {
    const type =
      SubscriptionErrorHandler.parseErrorCode(body?.code) ||
      (status === 401
        ? SubscriptionErrorType.USER_NOT_AUTHENTICATED
        : status === 403
        ? SubscriptionErrorType.INSUFFICIENT_PERMISSIONS
        : status === 404
        ? SubscriptionErrorType.SUBSCRIPTION_NOT_FOUND
        : status === 429
        ? SubscriptionErrorType.SERVER_ERROR
        : status >= 500
        ? SubscriptionErrorType.SERVER_ERROR
        : SubscriptionErrorType.UNKNOWN_ERROR);

    const message =
      body?.error ||
      body?.message ||
      SubscriptionErrorHandler.toUserMessage({ type, message: "" });

    return {
      type,
      message,
      code: body?.code,
      retryable: type === SubscriptionErrorType.SERVER_ERROR,
    };
  }

  /**
   * Parse a non-ok fetch Response into a SubscriptionError
   */
  static async fromFetchResponse(
    res: Response,
    context?: string
  ): Promise<SubscriptionError> {
    let body: any = undefined;
    try {
      const text = await res.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = { message: text };
        }
      }
    } catch {
      // ignore
    }

    const headerCode = res.headers.get("X-Error-Code") || undefined;

    const mapped = SubscriptionErrorHandler.fromHttpResponse(res.status, {
      code: (body?.code || headerCode) as string | undefined,
      error: body?.error as string | undefined,
      message: body?.message as string | undefined,
    });

    if (context) {
      mapped.details = { ...(mapped.details || {}), context };
    }
    return mapped;
  }
  /**
   * Static convenience method to match legacy usage:
   * SubscriptionErrorHandler.handle(error, context?)
   */
  static handle(error: unknown, context?: string): SubscriptionError {
    return handle(error, context);
  }
}

/**
 * Convenience helper for client fetch calls:
 * - If res.ok -> returns undefined (no error)
 * - If !ok -> parses response and returns a SubscriptionError ready for UX mapping
 */
export async function parseApiError(
  res: Response,
  context?: string
): Promise<SubscriptionError | undefined> {
  if (res.ok) return undefined;
  return SubscriptionErrorHandler.fromFetchResponse(res, context);
}
