/**
 * API Types - Generic response types shared between web and mobile
 */

/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
    data?: T;
    error?: string;
    success?: boolean;
    correlationId?: string;
}

/** Paginated response for list endpoints */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

/** Standard success response */
export interface SuccessResponse {
    success: boolean;
    message?: string;
}

/** Standard error response */
export interface ErrorResponse {
    error: string;
    code?: string;
    details?: Record<string, unknown>;
}

/** ID response (for create operations) */
export interface IdResponse {
    id: string;
}
