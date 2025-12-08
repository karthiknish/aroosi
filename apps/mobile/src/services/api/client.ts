/**
 * API Client - Base HTTP client for API requests
 */

import auth from '@react-native-firebase/auth';
import { API_BASE_URL } from '../../config';

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
    authenticated?: boolean;
}

interface ApiResponse<T> {
    data?: T;
    error?: string;
    status: number;
}

/**
 * Get Firebase auth token for authenticated requests
 */
async function getAuthToken(): Promise<string | null> {
    const user = auth().currentUser;
    if (!user) return null;
    return user.getIdToken();
}

/**
 * Make an API request
 */
export async function apiRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
): Promise<ApiResponse<T>> {
    const {
        method = 'GET',
        body,
        headers = {},
        authenticated = true,
    } = options;

    const url = `${API_BASE_URL}${endpoint}`;

    const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
    };

    // Add auth token if authenticated request
    if (authenticated) {
        const token = await getAuthToken();
        if (token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
        }
    }

    try {
        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            return {
                error: data?.error || data?.message || 'Request failed',
                status: response.status,
            };
        }

        return {
            data,
            status: response.status,
        };
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : 'Network error',
            status: 0,
        };
    }
}

// Convenience methods
export const api = {
    get: <T>(endpoint: string, authenticated = true) =>
        apiRequest<T>(endpoint, { method: 'GET', authenticated }),

    post: <T>(endpoint: string, body?: Record<string, unknown>, authenticated = true) =>
        apiRequest<T>(endpoint, { method: 'POST', body, authenticated }),

    put: <T>(endpoint: string, body?: Record<string, unknown>, authenticated = true) =>
        apiRequest<T>(endpoint, { method: 'PUT', body, authenticated }),

    patch: <T>(endpoint: string, body?: Record<string, unknown>, authenticated = true) =>
        apiRequest<T>(endpoint, { method: 'PATCH', body, authenticated }),

    delete: <T>(endpoint: string, authenticated = true) =>
        apiRequest<T>(endpoint, { method: 'DELETE', authenticated }),
};
