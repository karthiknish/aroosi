/**
 * API Client - Base HTTP client for API requests
 */

import auth from '@react-native-firebase/auth';
import { API_BASE_URL } from '../../config';

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: Record<string, unknown> | FormData;
    headers?: Record<string, string>;
    authenticated?: boolean;
    retries?: number;
    timeout?: number;
}

interface ApiResponse<T> {
    data?: T;
    error?: string;
    status: number;
    correlationId?: string;
}

const MAX_RETRIES = 2;
const DEFAULT_TIMEOUT = 15000; // 15 seconds

/**
 * Get Firebase auth token for authenticated requests
 */
async function getAuthToken(forceRefresh = false): Promise<string | null> {
    const user = auth().currentUser;
    if (!user) return null;
    try {
        return await user.getIdToken(forceRefresh);
    } catch (error) {
        console.error('[Auth] Failed to get token:', error);
        return null;
    }
}

/**
 * Make an API request with retries and token refresh
 */
export async function apiRequest<T>(
    endpoint: string,
    options: RequestOptions = {},
    attempt = 0
): Promise<ApiResponse<T>> {
    const {
        method = 'GET',
        body,
        headers = {},
        authenticated = true,
        timeout = DEFAULT_TIMEOUT,
    } = options;

    const url = `${API_BASE_URL}${endpoint}`;

    const requestHeaders: Record<string, string> = {
        ...headers,
    };

    if (!(body instanceof FormData)) {
        requestHeaders['Content-Type'] = 'application/json';
    }

    // Add auth token if authenticated request
    if (authenticated) {
        const token = await getAuthToken(attempt > 0 && attempt <= MAX_RETRIES);
        if (token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
        }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const correlationId = response.headers.get('x-correlation-id') || undefined;
        const data = await response.json().catch(() => null);

        // Handle 401 Unauthorized - retry once with forced token refresh
        if (response.status === 401 && authenticated && attempt === 0) {
            console.warn(`[API] 401 Unauthorized for ${endpoint}. Retrying with fresh token...`);
            return apiRequest<T>(endpoint, options, attempt + 1);
        }

        // Handle 5xx errors or rate limiting - retry with exponential backoff
        if ((response.status >= 500 || response.status === 429) && attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 1000;
            console.warn(`[API] ${response.status} for ${endpoint}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return apiRequest<T>(endpoint, options, attempt + 1);
        }

        if (!response.ok) {
            return {
                error: data?.error || data?.message || `Request failed with status ${response.status}`,
                status: response.status,
                correlationId,
            };
        }

        return {
            data,
            status: response.status,
            correlationId,
        };
    } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            return {
                error: 'Request timed out',
                status: 408,
            };
        }

        // Retry network errors
        if (attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt) * 1000;
            console.warn(`[API] Network error for ${endpoint}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return apiRequest<T>(endpoint, options, attempt + 1);
        }

        return {
            error: error instanceof Error ? error.message : 'Network error',
            status: 0,
        };
    }
}

// Convenience methods
export const api = {
    get: <T>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
        apiRequest<T>(endpoint, { ...options, method: 'GET' }),

    post: <T>(endpoint: string, body?: Record<string, unknown> | FormData, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
        apiRequest<T>(endpoint, { ...options, method: 'POST', body }),

    put: <T>(endpoint: string, body?: Record<string, unknown> | FormData, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
        apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),

    patch: <T>(endpoint: string, body?: Record<string, unknown> | FormData, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
        apiRequest<T>(endpoint, { ...options, method: 'PATCH', body }),

    delete: <T>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
        apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
