export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
  validationErrors?: Record<string, string>;
}

export class ApiError extends Error {
  public statusCode: number;
  public data?: unknown;

  constructor(message: string, statusCode: number = 500, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

export const apiResponse = {
  success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  },

  error(error: string, statusCode?: number): ApiResponse {
    return {
      success: false,
      error,
      statusCode,
    };
  },

  validationError(errors: Record<string, string>): ApiResponse {
    return {
      success: false,
      error: 'Validation failed',
      validationErrors: errors,
      statusCode: 400,
    };
  },

  unauthorized(): ApiResponse {
    return {
      success: false,
      error: 'Unauthorized',
      statusCode: 401,
    };
  },

  forbidden(): ApiResponse {
    return {
      success: false,
      error: 'Forbidden',
      statusCode: 403,
    };
  },

  notFound(message?: string): ApiResponse {
    return {
      success: false,
      error: message || 'Not found',
      statusCode: 404,
    };
  },
};