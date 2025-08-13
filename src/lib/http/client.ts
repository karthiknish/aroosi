/**
 * Centralized HTTP client for cookie-based Convex Auth sessions.
 * - No token storage or Authorization headers; server relies on HttpOnly cookies.
 * - Preserves correlation-id header for tracing.
 *
 * NOTE: This runs in browser contexts. Do not use on server components.
 */
// HttpMethod type removed (unused)

export interface FetchJsonOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  /**
   * Correlation id for logging/debugging on the server.
   * If not provided, a stable per-session id will be generated (browser only).
   */
  correlationId?: string;
}

export async function fetchJson<T = unknown>(input: string, opts: FetchJsonOptions = {}): Promise<T> {
  const { method = "GET", headers: userHeaders, correlationId, ...rest } = opts;

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

  const resp = await fetch(input, {
    method,
    headers,
    ...rest,
    // Cookies are automatically sent for same-origin requests by default.
    // Ensure your routes set proper SameSite and domain flags.
  });

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
    (error as any).status = resp.status;
    throw error;
  }

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