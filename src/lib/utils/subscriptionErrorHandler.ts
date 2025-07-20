/**
 * Unified Subscription Error Handler for Aroosi Web and Mobile
 * Provides consistent error handling across both platforms
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
}

export interface SubscriptionError {
  type: SubscriptionErrorType;
  message: string;
  code?: string;
  details?: any;
  retryable?: boolean;
  userAction?: string;
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
  };

  static handle(error: any, context?: string): SubscriptionError {
    // Handle different error formats
    let errorType: SubscriptionErrorType;
    let message: string;
    let code: string | undefined;
    let details: any = {};

    if (typeof error === "string") {
      message = error;
      errorType = this.inferErrorType(error);
    } else if (error && typeof error === "object") {
      message = error.message || error.error || "Unknown error";
      code = error.code || error.errorCode;

      // Try to infer error type from error object
      errorType = this.inferErrorTypeFromObject(error);
      details = { ...error };
    } else {
      message = "Unknown error occurred";
      errorType = SubscriptionErrorType.UNKNOWN_ERROR;
    }

    // Add context information
    if (context) {
      details.context = context;
    }

    const errorConfig = this.ERROR_MESSAGES[errorType];
    return {
      type: errorType,
      message,
      code,
      details,
      retryable: errorConfig?.retryable ?? false,
      userAction: errorConfig?.userAction,
    };
  }

  private static inferErrorType(error: string): SubscriptionErrorType {
    const lowerError = error.toLowerCase();

    if (lowerError.includes("network") || lowerError.includes("connection")) {
      return SubscriptionErrorType.NETWORK_ERROR;
    }
    if (lowerError.includes("timeout")) {
      return SubscriptionErrorType.TIMEOUT_ERROR;
    }
    if (lowerError.includes("payment") || lowerError.includes("billing")) {
      return SubscriptionErrorType.PAYMENT_FAILED;
    }
    if (lowerError.includes("cancel")) {
      return SubscriptionErrorType.PURCHASE_CANCELLED;
    }
    if (
      lowerError.includes("already own") ||
      lowerError.includes("already purchased")
    ) {
      return SubscriptionErrorType.PURCHASE_ALREADY_OWNED;
    }
    if (
      lowerError.includes("not authenticated") ||
      lowerError.includes("unauthorized")
    ) {
      return SubscriptionErrorType.USER_NOT_AUTHENTICATED;
    }
    if (lowerError.includes("expired")) {
      return SubscriptionErrorType.SUBSCRIPTION_EXPIRED;
    }
    if (lowerError.includes("not found")) {
      return SubscriptionErrorType.SUBSCRIPTION_NOT_FOUND;
    }

    return SubscriptionErrorType.UNKNOWN_ERROR;
  }

  private static inferErrorTypeFromObject(error: any): SubscriptionErrorType {
    // Check for specific error codes
    if (error.code) {
      switch (error.code) {
        case "E_USER_CANCELLED":
        case "USER_CANCELLED":
          return SubscriptionErrorType.PURCHASE_CANCELLED;
        case "E_ALREADY_OWNED":
        case "ALREADY_OWNED":
          return SubscriptionErrorType.PURCHASE_ALREADY_OWNED;
        case "E_NETWORK_ERROR":
        case "NETWORK_ERROR":
          return SubscriptionErrorType.NETWORK_ERROR;
        case "E_SERVICE_ERROR":
        case "STORE_ERROR":
          return SubscriptionErrorType.STORE_UNAVAILABLE;
        case "E_ITEM_UNAVAILABLE":
          return SubscriptionErrorType.INVALID_PLAN;
        case "E_USER_ERROR":
          return SubscriptionErrorType.PURCHASE_NOT_ALLOWED;
        default:
          return this.inferErrorType(error.message || "");
      }
    }

    return this.inferErrorType(error.message || "");
  }

  static getUserFriendlyMessage(error: SubscriptionError): string {
    return this.ERROR_MESSAGES[error.type]?.userMessage || error.message;
  }

  static isRetryable(error: SubscriptionError): boolean {
    return error.retryable ?? false;
  }

  static shouldShowToUser(error: SubscriptionError): boolean {
    // Don't show user cancellation errors to user
    return error.type !== SubscriptionErrorType.PURCHASE_CANCELLED;
  }

  static getErrorAction(error: SubscriptionError): string | undefined {
    return error.userAction;
  }

  static logError(error: SubscriptionError, context?: string): void {
    console.error(`[SubscriptionError${context ? `:${context}` : ""}]`, {
      type: error.type,
      message: error.message,
      code: error.code,
      details: error.details,
    });
  }
}

// Helper function for consistent error handling across platforms
export function handleSubscriptionError(
  error: any,
  context?: string,
  showToUser: boolean = true
): SubscriptionError {
  const subscriptionError = SubscriptionErrorHandler.handle(error, context);

  if (
    showToUser &&
    SubscriptionErrorHandler.shouldShowToUser(subscriptionError)
  ) {
    // Platform-specific display logic should be handled by the caller
    SubscriptionErrorHandler.logError(subscriptionError, context);
  }

  return subscriptionError;
}

// Type guard for subscription errors
export function isSubscriptionError(error: any): error is SubscriptionError {
  return (
    error && typeof error === "object" && "type" in error && "message" in error
  );
}
