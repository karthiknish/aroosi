/**
 * Centralized HTTP client with pure token model:
 * - Stores tokens in localStorage (accessToken, refreshToken)
 * - Attaches Authorization: Bearer "accessToken" to all requests
 * - On 401, attempts one refresh using refreshToken and retries the original request once
 * - Exposes helpers to get/set/clear tokens
 *
 * NOTE: This runs in browser contexts. Do not use on server components.
 */

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export const tokenStorage = {
  get access(): string | null {
    try {
      return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    } catch {
      return null;
    }
  },
  set access(value: string | null) {
    try {
      if (typeof window === "undefined") return;
      if (value) localStorage.setItem("accessToken", value);
      else localStorage.removeItem("accessToken");
    } catch {
      // ignore
    }
  },
  get refresh(): string | null {
    try {
      return typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;
    } catch {
      return null;
    }
  },
  set refresh(value: string | null) {
    try {
      if (typeof window === "undefined") return;
      if (value) localStorage.setItem("refreshToken", value);
      else localStorage.removeItem("refreshToken");
    } catch {
      // ignore
    }
  },
  clearAll() {
    this.access = null;
    this.refresh = null;
  },
};

async function refreshTokensOnce(correlationId?: string): Promise<boolean> {
  const refreshToken = tokenStorage.refresh;
  if (!refreshToken) return false;

  const resp = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${refreshToken}`,
      Accept: "application/json",
      ...(correlationId ? { "x-correlation-id": correlationId } : {}),
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    return false;
  }

  // Expecting { accessToken, refreshToken, ... }
  const data = (await resp.json()) as Partial<{
    accessToken: string;
    refreshToken: string;
  }>;

  if (data.accessToken) tokenStorage.access = data.accessToken;
  if (data.refreshToken) tokenStorage.refresh = data.refreshToken;

  return Boolean(data.accessToken);
}

export interface FetchJsonOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  /**
   * If true, do not attach Authorization even if token exists.
   */
  skipAuth?: boolean;
  /**
   * If true, do not attempt automatic refresh on 401.
   */
  noRefresh?: boolean;
  /**
   * Optional correlation id for logging/debugging on the server.
   */
  correlationId?: string;
}

export async function fetchJson<T = unknown>(input: string, opts: FetchJsonOptions = {}): Promise<T> {
  const {
    method = "GET",
    headers: userHeaders,
    skipAuth = false,
    noRefresh = false,
    correlationId,
    ...rest
  } = opts;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...userHeaders,
  };

  if (correlationId) headers["x-correlation-id"] = correlationId;

  const accessToken = tokenStorage.access;

  if (!skipAuth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let resp = await fetch(input, {
    method,
    headers,
    ...rest,
  });

  // If unauthorized and we can refresh, try once
  if (resp.status === 401 && !noRefresh && !skipAuth) {
    const refreshed = await refreshTokensOnce(correlationId);
    if (refreshed) {
      const retryHeaders: Record<string, string> = {
        ...headers,
      };
      const newAccess = tokenStorage.access;
      if (newAccess) retryHeaders.Authorization = `Bearer ${newAccess}`;
      resp = await fetch(input, {
        method,
        headers: retryHeaders,
        ...rest,
      });
    }
  }

  // Throw on non-2xx
  if (!resp.ok) {
    let errText = "";
    try {
      errText = await resp.text();
    } catch {
      // ignore
    }
    const error = new Error(
      `HTTP ${resp.status} ${resp.statusText} for ${method} ${input}` + (errText ? ` :: ${errText}` : "")
    );
    // Attach status for callers
    (error as any).status = resp.status;
    throw error;
  }

  // If content-type is JSON, parse. Otherwise return text cast to T for flexibility in callers.
  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await resp.json()) as T;
  }
  return (await resp.text()) as unknown as T;
}

export async function getJson<T = unknown>(url: string, opts?: FetchJsonOptions) {
  return fetchJson<T>(url, { ...opts, method: "GET" });
}

export async function postJson<T = unknown>(url: string, body?: unknown, opts?: FetchJsonOptions) {
  const headers = { "Content-Type": "application/json", ...(opts?.headers || {}) };
  return fetchJson<T>(url, {
    ...opts,
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function putJson<T = unknown>(url: string, body?: unknown, opts?: FetchJsonOptions) {
  const headers = { "Content-Type": "application/json", ...(opts?.headers || {}) };
  return fetchJson<T>(url, {
    ...opts,
    method: "PUT",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function patchJson<T = unknown>(url: string, body?: unknown, opts?: FetchJsonOptions) {
  const headers = { "Content-Type": "application/json", ...(opts?.headers || {}) };
  return fetchJson<T>(url, {
    ...opts,
    method: "PATCH",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function deleteJson<T = unknown>(url: string, opts?: FetchJsonOptions) {
  return fetchJson<T>(url, { ...opts, method: "DELETE" });
}