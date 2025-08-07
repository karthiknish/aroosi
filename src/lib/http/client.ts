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

/**
 * Lightweight token event bus using window CustomEvent.
 * Consumers can listen for "token-changed" to react immediately on updates.
 */
function emitTokenChanged(detail: {
  accessToken: string | null;
  refreshToken: string | null;
  reason: "set" | "clear" | "refresh";
}) {
  try {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("token-changed", { detail }));
  } catch {
    // ignore
  }
}

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
      emitTokenChanged({
        accessToken: value ?? null,
        refreshToken: tokenStorage.refresh,
        reason: value ? "set" : "clear",
      });
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
      emitTokenChanged({
        accessToken: tokenStorage.access,
        refreshToken: value ?? null,
        reason: value ? "set" : "clear",
      });
    } catch {
      // ignore
    }
  },
  clearAll() {
    try {
      this.access = null;
      this.refresh = null;
      emitTokenChanged({
        accessToken: null,
        refreshToken: null,
        reason: "clear",
      });
    } catch {
      // ignore
    }
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

  let updated = false;
  if (data.accessToken) {
    tokenStorage.access = data.accessToken;
    updated = true;
  }
  if (data.refreshToken) {
    tokenStorage.refresh = data.refreshToken;
    updated = true;
  }

  if (updated) {
    emitTokenChanged({
      accessToken: tokenStorage.access,
      refreshToken: tokenStorage.refresh,
      reason: "refresh",
    });
  }

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
   * Correlation id for logging/debugging on the server.
   * If not provided, a stable per-session id will be generated (browser only).
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

  // Generate or reuse a stable correlation id per browser session if not provided
  let cid = correlationId;
  try {
    if (!cid && typeof window !== "undefined") {
      const KEY = "__cid";
      cid = sessionStorage.getItem(KEY) || "";
      if (!cid) {
        cid = Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem(KEY, cid);
      }
    }
  } catch {
    // ignore storage errors
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...userHeaders,
  };

  if (cid) headers["x-correlation-id"] = cid;

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
    const refreshed = await refreshTokensOnce(cid);
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