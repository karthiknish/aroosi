import { auth } from "../firebase";

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * Perform a fetch adding a Firebase ID token in the Authorization header.
 * Includes retry logic, timeouts, and automatic token refresh.
 */
export async function fetchWithFirebaseAuth(
  input: RequestInfo | URL,
  options: FetchOptions = {}
): Promise<Response> {
  const { 
    timeout = 15000, 
    retries = 2, 
    retryDelay = 1000, 
    ...init 
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      let token: string | undefined;
      try {
        const user = auth.currentUser;
        if (user) {
          // Force refresh if it's a retry after a potential 401
          token = await user.getIdToken(attempt > 0);
        }
      } catch (err) {
        console.warn("fetchWithFirebaseAuth: failed to get token", err);
      }

      const headers = new Headers(init.headers || {});
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(input, {
        ...init,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If we get a 401 and haven't exhausted retries, try again with a forced token refresh
      if (response.status === 401 && attempt < retries) {
        console.warn(`fetchWithFirebaseAuth: 401 Unauthorized, retrying (attempt ${attempt + 1}/${retries})...`);
        continue;
      }

      // If it's a 5xx error, retry
      if (response.status >= 500 && attempt < retries) {
        console.warn(`fetchWithFirebaseAuth: Server error ${response.status}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        continue;
      }

      return response;
    } catch (err) {
      lastError = err as Error;
      if (attempt < retries) {
        const isTimeout = err instanceof Error && err.name === 'AbortError';
        console.warn(`fetchWithFirebaseAuth: ${isTimeout ? 'Timeout' : 'Request failed'}, retrying...`, err);
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
        continue;
      }
    }
  }

  throw lastError || new Error("Request failed after multiple attempts");
}

/** Convenience helper returning parsed JSON, throwing on non-2xx */
export async function fetchJsonWithFirebaseAuth<T = any>(
  input: RequestInfo | URL,
  options: FetchOptions = {}
): Promise<T> {
  const res = await fetchWithFirebaseAuth(input, options);
  
  if (!res.ok) {
    let errorData;
    try {
      errorData = await res.json();
    } catch {
      const text = await res.text().catch(() => "");
      errorData = { error: text || `Request failed (${res.status})` };
    }
    
    const error = new Error(errorData.error || errorData.message || `Request failed (${res.status})`);
    (error as any).status = res.status;
    (error as any).data = errorData;
    throw error;
  }
  
  return (await res.json().catch(() => ({}))) as T;
}
