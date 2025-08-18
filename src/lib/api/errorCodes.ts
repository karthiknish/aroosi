/**
 * Standardized error codes for API responses
 */
export const ERROR_CODES = {
  // Validation errors
  INVALID_REQUEST: "INVALID_REQUEST",
  MISSING_FIELDS: "MISSING_FIELDS",
  INVALID_FORMAT: "INVALID_FORMAT",

  // Interest-specific errors
  SELF_INTEREST: "SELF_INTEREST",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  DUPLICATE_INTEREST: "DUPLICATE_INTEREST",
  INTEREST_NOT_FOUND: "INTEREST_NOT_FOUND",

  // Authentication/Authorization errors
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",

  // System errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * User-friendly error messages mapped to error codes
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.INVALID_REQUEST]: "Invalid request format. Please try again.",
  [ERROR_CODES.MISSING_FIELDS]: "Required information is missing.",
  [ERROR_CODES.INVALID_FORMAT]:
    "The provided information is not in the correct format.",

  [ERROR_CODES.SELF_INTEREST]: "You cannot send an interest to yourself.",
  [ERROR_CODES.USER_NOT_FOUND]:
    "User not found. They may have deactivated their account.",
  [ERROR_CODES.DUPLICATE_INTEREST]: "Interest already sent to this user.",
  [ERROR_CODES.INTEREST_NOT_FOUND]: "Interest not found or has been removed.",

  [ERROR_CODES.UNAUTHORIZED]: "Please sign in to send interests.",
  [ERROR_CODES.FORBIDDEN]: "You do not have permission to perform this action.",
  [ERROR_CODES.TOKEN_EXPIRED]:
    "Your session has expired. Please sign in again.",

  [ERROR_CODES.INTERNAL_ERROR]:
    "Something went wrong on our end. Please try again.",
  [ERROR_CODES.NETWORK_ERROR]:
    "Network error. Please check your connection and try again.",
  [ERROR_CODES.SERVICE_UNAVAILABLE]:
    "Service is temporarily unavailable. Please try again later.",
};

/**
 * Validation issue interface
 */
export interface ValidationIssue {
  field: string;
  message: string;
  code: string;
}

/**
 * Enhanced API error response structure
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
  details?: {
    field?: string;
    issues?: ValidationIssue[];
    suggestions?: string[];
  };
  correlationId?: string;
}

/**
 * Create a structured error response
 */
export function createErrorResponse(
  code: ErrorCode,
  customMessage?: string,
  details?: ApiErrorResponse["details"],
  correlationId?: string
): ApiErrorResponse {
  return {
    success: false,
    error: customMessage || ERROR_MESSAGES[code],
    code,
    details,
    correlationId,
  };
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(
  issues: ValidationIssue[],
  correlationId?: string
): ApiErrorResponse {
  const fieldNames = issues.map((issue) => issue.field).join(", ");
  return createErrorResponse(
    ERROR_CODES.MISSING_FIELDS,
    `Missing required information: ${fieldNames}`,
    { issues },
    correlationId
  );
}
