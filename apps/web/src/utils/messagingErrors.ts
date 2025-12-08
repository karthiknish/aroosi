/**
 * Messaging Error Types and Classifications for Web
 */
export enum MessagingErrorType {
  // Network errors
  NETWORK_ERROR = "NETWORK_ERROR",
  CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT",
  SERVER_ERROR = "SERVER_ERROR",

  // Authentication errors
  UNAUTHORIZED = "UNAUTHORIZED",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",

  // Permission errors
  SUBSCRIPTION_REQUIRED = "SUBSCRIPTION_REQUIRED",
  DAILY_LIMIT_EXCEEDED = "DAILY_LIMIT_EXCEEDED",
  FEATURE_NOT_AVAILABLE = "FEATURE_NOT_AVAILABLE",

  // Voice message errors
  MICROPHONE_PERMISSION_DENIED = "MICROPHONE_PERMISSION_DENIED",
  RECORDING_FAILED = "RECORDING_FAILED",
  VOICE_UPLOAD_FAILED = "VOICE_UPLOAD_FAILED",
  VOICE_DURATION_EXCEEDED = "VOICE_DURATION_EXCEEDED",

  // Message errors
  MESSAGE_TOO_LONG = "MESSAGE_TOO_LONG",
  INVALID_MESSAGE_CONTENT = "INVALID_MESSAGE_CONTENT",
  MESSAGE_SEND_FAILED = "MESSAGE_SEND_FAILED",

  // User relationship errors
  USER_BLOCKED = "USER_BLOCKED",
  USER_NOT_MATCHED = "USER_NOT_MATCHED",
  CONVERSATION_NOT_FOUND = "CONVERSATION_NOT_FOUND",

  // Generic errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
}

export interface MessagingError {
  type: MessagingErrorType;
  message: string;
  userMessage: string;
  isRetryable: boolean;
  retryDelay?: number; // in milliseconds
  metadata?: Record<string, any>;
}

export class MessagingErrorHandler {
  private static errorMap: Record<
    MessagingErrorType,
    Omit<MessagingError, "type">
  > = {
    [MessagingErrorType.NETWORK_ERROR]: {
      message: "Network connection failed",
      userMessage: "Please check your internet connection and try again.",
      isRetryable: true,
      retryDelay: 2000,
    },
    [MessagingErrorType.CONNECTION_TIMEOUT]: {
      message: "Request timed out",
      userMessage: "The request took too long. Please try again.",
      isRetryable: true,
      retryDelay: 3000,
    },
    [MessagingErrorType.SERVER_ERROR]: {
      message: "Server error occurred",
      userMessage:
        "Something went wrong on our end. Please try again in a moment.",
      isRetryable: true,
      retryDelay: 5000,
    },
    [MessagingErrorType.UNAUTHORIZED]: {
      message: "User not authorized",
      userMessage: "Please log in again to continue.",
      isRetryable: false,
    },
    [MessagingErrorType.TOKEN_EXPIRED]: {
      message: "Authentication token expired",
      userMessage: "Your session has expired. Please log in again.",
      isRetryable: false,
    },
    [MessagingErrorType.SUBSCRIPTION_REQUIRED]: {
      message: "Premium subscription required",
      userMessage:
        "This feature requires a Premium subscription. Upgrade to continue.",
      isRetryable: false,
    },
    [MessagingErrorType.DAILY_LIMIT_EXCEEDED]: {
      message: "Daily message limit exceeded",
      userMessage:
        "You've reached your daily message limit. Upgrade to Premium for unlimited messaging.",
      isRetryable: false,
    },
    [MessagingErrorType.FEATURE_NOT_AVAILABLE]: {
      message: "Feature not available for current subscription",
      userMessage: "This feature is not available with your current plan.",
      isRetryable: false,
    },
    [MessagingErrorType.MICROPHONE_PERMISSION_DENIED]: {
      message: "Microphone permission denied",
      userMessage: "Please allow microphone access to record voice messages.",
      isRetryable: false,
    },
    [MessagingErrorType.RECORDING_FAILED]: {
      message: "Voice recording failed",
      userMessage: "Failed to record voice message. Please try again.",
      isRetryable: true,
      retryDelay: 1000,
    },
    [MessagingErrorType.VOICE_UPLOAD_FAILED]: {
      message: "Voice message upload failed",
      userMessage: "Failed to send voice message. Please try again.",
      isRetryable: true,
      retryDelay: 2000,
    },
    [MessagingErrorType.VOICE_DURATION_EXCEEDED]: {
      message: "Voice message too long",
      userMessage: "Voice message exceeds maximum duration for your plan.",
      isRetryable: false,
    },
    [MessagingErrorType.MESSAGE_TOO_LONG]: {
      message: "Message exceeds maximum length",
      userMessage: "Your message is too long. Please shorten it and try again.",
      isRetryable: false,
    },
    [MessagingErrorType.INVALID_MESSAGE_CONTENT]: {
      message: "Invalid message content",
      userMessage:
        "Message contains invalid content. Please check and try again.",
      isRetryable: false,
    },
    [MessagingErrorType.MESSAGE_SEND_FAILED]: {
      message: "Failed to send message",
      userMessage: "Failed to send message. Please try again.",
      isRetryable: true,
      retryDelay: 2000,
    },
    [MessagingErrorType.USER_BLOCKED]: {
      message: "User is blocked",
      userMessage: "You cannot send messages to this user.",
      isRetryable: false,
    },
    [MessagingErrorType.USER_NOT_MATCHED]: {
      message: "Users are not matched",
      userMessage: "You can only message users you've matched with.",
      isRetryable: false,
    },
    [MessagingErrorType.CONVERSATION_NOT_FOUND]: {
      message: "Conversation not found",
      userMessage: "This conversation no longer exists.",
      isRetryable: false,
    },
    [MessagingErrorType.UNKNOWN_ERROR]: {
      message: "Unknown error occurred",
      userMessage: "Something went wrong. Please try again.",
      isRetryable: true,
      retryDelay: 3000,
    },
    [MessagingErrorType.VALIDATION_ERROR]: {
      message: "Validation failed",
      userMessage: "Please check your input and try again.",
      isRetryable: false,
    },
  };

  /**
   * Create a MessagingError from an error type
   */
  static createError(
    type: MessagingErrorType,
    metadata?: Record<string, any>
  ): MessagingError {
    const errorTemplate = this.errorMap[type];
    return {
      type,
      ...errorTemplate,
      metadata,
    };
  }

  /**
   * Classify an error from various sources (API, network, etc.)
   */
  static classifyError(error: any): MessagingError {
    // Handle network errors
    if (error.name === "NetworkError" || error.code === "NETWORK_ERROR") {
      return this.createError(MessagingErrorType.NETWORK_ERROR);
    }

    // Handle timeout errors
    if (error.name === "TimeoutError" || error.code === "TIMEOUT") {
      return this.createError(MessagingErrorType.CONNECTION_TIMEOUT);
    }

    // Handle fetch errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return this.createError(MessagingErrorType.NETWORK_ERROR);
    }

    // Handle HTTP status codes
    if (error.status || error.response?.status) {
      const status = error.status || error.response.status;

      switch (status) {
        case 401:
          return this.createError(MessagingErrorType.UNAUTHORIZED);
        case 403:
          return this.createError(MessagingErrorType.SUBSCRIPTION_REQUIRED);
        case 429:
          return this.createError(MessagingErrorType.DAILY_LIMIT_EXCEEDED);
        case 500:
        case 502:
        case 503:
        case 504:
          return this.createError(MessagingErrorType.SERVER_ERROR);
        default:
          return this.createError(MessagingErrorType.UNKNOWN_ERROR);
      }
    }

    // Handle specific error messages
    const errorMessage = error.message?.toLowerCase() || "";

    if (
      errorMessage.includes("microphone") ||
      errorMessage.includes("permission")
    ) {
      return this.createError(MessagingErrorType.MICROPHONE_PERMISSION_DENIED);
    }

    if (errorMessage.includes("recording")) {
      return this.createError(MessagingErrorType.RECORDING_FAILED);
    }

    if (errorMessage.includes("upload")) {
      return this.createError(MessagingErrorType.VOICE_UPLOAD_FAILED);
    }

    if (
      errorMessage.includes("duration") ||
      errorMessage.includes("too long")
    ) {
      return this.createError(MessagingErrorType.VOICE_DURATION_EXCEEDED);
    }

    if (errorMessage.includes("blocked")) {
      return this.createError(MessagingErrorType.USER_BLOCKED);
    }

    if (
      errorMessage.includes("subscription") ||
      errorMessage.includes("premium")
    ) {
      return this.createError(MessagingErrorType.SUBSCRIPTION_REQUIRED);
    }

    if (errorMessage.includes("limit")) {
      return this.createError(MessagingErrorType.DAILY_LIMIT_EXCEEDED);
    }

    // Default to unknown error
    return this.createError(MessagingErrorType.UNKNOWN_ERROR, {
      originalError: error.message || error.toString(),
    });
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: MessagingError): string {
    return error.userMessage;
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: MessagingError): boolean {
    return error.isRetryable;
  }

  /**
   * Get retry delay for retryable errors
   */
  static getRetryDelay(error: MessagingError): number {
    return error.retryDelay || 3000;
  }

  /**
   * Create retry mechanism for retryable errors
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    onError?: (error: MessagingError, attempt: number) => void
  ): Promise<T> {
    let lastError: MessagingError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.classifyError(error);

        if (onError) {
          onError(lastError, attempt);
        }

        // Don't retry if error is not retryable or we've reached max attempts
        if (!this.isRetryable(lastError) || attempt === maxRetries) {
          throw lastError;
        }

        // Wait before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, this.getRetryDelay(lastError))
        );
      }
    }

    throw lastError!;
  }
}

/**
 * Hook for handling messaging errors with user feedback
 */
export function useMessagingErrorHandler() {
  const handleError = (error: any, showToast?: (message: string) => void) => {
    const messagingError = MessagingErrorHandler.classifyError(error);
    const userMessage = MessagingErrorHandler.getUserMessage(messagingError);

    if (showToast) {
      showToast(userMessage);
    }

    return messagingError;
  };

  const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    onError?: (error: MessagingError, attempt: number) => void
  ): Promise<T> => {
    return MessagingErrorHandler.withRetry(operation, maxRetries, onError);
  };

  return {
    handleError,
    withRetry,
    classifyError: MessagingErrorHandler.classifyError,
    isRetryable: MessagingErrorHandler.isRetryable,
    getUserMessage: MessagingErrorHandler.getUserMessage,
  };
}
