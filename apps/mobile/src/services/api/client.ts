/**
 * API Client - Base HTTP client for API requests
 */

import auth from '@react-native-firebase/auth';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, DEBUG } from '../../config';
import { nowTimestamp } from '../../utils/timestamp';

interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: Record<string, unknown> | FormData;
    headers?: Record<string, string>;
    authenticated?: boolean;
    retries?: number;
    timeout?: number;
    cache?: boolean;
    cacheTTL?: number;
}

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    code?: string;
    status: number;
    correlationId?: string;
    fromCache?: boolean;
}

const MAX_RETRIES = 2;
const DEFAULT_TIMEOUT = 15000; // 15 seconds
const CACHE_PREFIX = '@api_cache:';
const DEFAULT_CACHE_TTL = 1000 * 60 * 5; // 5 minutes

/**
 * Get a cache key for an endpoint
 */
function getCacheKey(endpoint: string): string {
    return `${CACHE_PREFIX}${endpoint}`;
}

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

    // Handle caching for GET requests
    const cacheKey = getCacheKey(endpoint);
    if (method === 'GET' && options.cache) {
        try {
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
                const { data, timestamp, ttl } = JSON.parse(cachedData);
                const isExpired = nowTimestamp() - timestamp > (ttl || DEFAULT_CACHE_TTL);
                
                // Check network status
                const netInfo = await NetInfo.fetch();
                
                if (!isExpired && netInfo.isConnected) {
                    if (DEBUG) console.log(`[API] Cache hit: ${endpoint}`);
                    return {
                        data,
                        status: 200,
                        fromCache: true,
                    };
                }
                
                if (!netInfo.isConnected) {
                    if (DEBUG) console.log(`[API] Offline, using cached data: ${endpoint}`);
                    return {
                        data,
                        status: 200,
                        fromCache: true,
                    };
                }
            }
        } catch (error) {
            console.error('[API] Cache read error:', error);
        }
    }

    // Check network status
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
        return {
            error: 'No internet connection',
            status: 0,
        };
    }

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

    if (DEBUG) {
        console.log(`[API] ${method} ${url}`, {
            headers: requestHeaders,
            body: body instanceof FormData ? '[FormData]' : body,
        });
    }

    try {
        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const correlationId = response.headers.get('x-correlation-id') || undefined;
        let responseJson = await response.json().catch(() => null);

        // Handle standardized backend response (Pattern 1): { success: true, data: T, ... }
        // If we see success: true and a data field, we unwrap it into the return data
        let finalData = responseJson;
        if (responseJson && typeof responseJson === 'object' && responseJson.success === true && 'data' in responseJson) {
            finalData = responseJson.data;
        }

        if (DEBUG) {
            console.log(`[API] ${response.status} ${endpoint}`, {
                correlationId,
                data: finalData,
            });
        }

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
                error: responseJson?.error || responseJson?.message || `Request failed with status ${response.status}`,
                code: responseJson?.code,
                status: response.status,
                correlationId,
            };
        }

        // Store in cache if requested
        if (method === 'GET' && options.cache && finalData) {
            try {
                await AsyncStorage.setItem(
                    cacheKey,
                    JSON.stringify({
                        data: finalData,
                        timestamp: nowTimestamp(),
                        ttl: options.cacheTTL || DEFAULT_CACHE_TTL,
                    })
                );
            } catch (error) {
                console.error('[API] Cache write error:', error);
            }
        }

        return {
            data: finalData,
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
