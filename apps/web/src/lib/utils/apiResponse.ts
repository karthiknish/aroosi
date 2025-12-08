export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// Utility function to extract error message from ApiError
export function getErrorMessage(error: ApiError | string | undefined): string {
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

export const apiResponse = {
  success<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      data,
    };
  },

  error(code: string, message: string, details?: any): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
    };
  },

  validationError(errors: Record<string, string>): ApiResponse {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: errors,
      },
    };
  },

  unauthorized(): ApiResponse {
    return {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      },
    };
  },

  forbidden(): ApiResponse {
    return {
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "Forbidden",
      },
    };
  },

  notFound(message?: string): ApiResponse {
    return {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: message || "Not found",
      },
    };
  },
};
