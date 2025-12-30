/**
 * Shared request helper for browser-side API clients.
 *
 * Goals:
 * - Add timeouts to prevent infinite hangs
 * - Provide best-effort offline fallback via localStorage caching for GETs
 * - Keep response parsing/throw semantics consistent across callers
 */

export type SafeRequestOptions = {
  timeoutMs?: number;
  /** Enable offline cache fallback (GET only). Defaults to false. */
  cache?:
    | boolean
    | {
        key?: string;
        ttlMs?: number;
      };
};

type CacheEntry = {
  expiresAt: number;
  payload: unknown;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function nowMs(): number {
  return Date.now();
}

function getCacheKey(endpoint: string): string {
  return `aroosi_api_cache:v1:${endpoint}`;
}

function readCache(endpoint: string): unknown | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(getCacheKey(endpoint));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt <= nowMs()) {
      window.localStorage.removeItem(getCacheKey(endpoint));
      return null;
    }
    return parsed.payload ?? null;
  } catch {
    return null;
  }
}

function writeCache(endpoint: string, payload: unknown, ttlMs: number): void {
  if (!isBrowser()) return;
  try {
    const entry: CacheEntry = {
      expiresAt: nowMs() + ttlMs,
      payload,
    };
    window.localStorage.setItem(getCacheKey(endpoint), JSON.stringify(entry));
  } catch {
    // Ignore quota/serialization issues
  }
}

function shouldUseCache(method: string | undefined): boolean {
  return (method || "GET").toUpperCase() === "GET";
}

function isNetworkOrTimeoutError(err: unknown): boolean {
  return (
    (err instanceof Error && err.name === "AbortError") ||
    err instanceof TypeError
  );
}

async function fetchWithTimeout(
  endpoint: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  // If caller provided a signal, abort when it aborts.
  if (init.signal) {
    try {
      const signal = init.signal;
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", () => controller.abort(), { once: true });
    } catch {
      // ignore
    }
  }

  try {
    const res = await fetch(endpoint, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

export async function safeRequest(
  endpoint: string,
  init: RequestInit,
  options: SafeRequestOptions = {}
): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? 15_000;

  const cacheConfig =
    options.cache === true
      ? { ttlMs: 5 * 60_000 }
      : options.cache === false || options.cache == null
      ? null
      : { ttlMs: options.cache.ttlMs ?? 5 * 60_000, key: options.cache.key };

  const method = (init.method || "GET").toUpperCase();
  const cacheEnabled = !!cacheConfig && shouldUseCache(method);

  // If offline, immediately try cache.
  if (cacheEnabled && isBrowser() && typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = readCache(cacheConfig.key || endpoint);
    if (cached !== null) return cached;
  }

  try {
    const res = await fetchWithTimeout(endpoint, init, timeoutMs);

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.toLowerCase().includes("application/json");

    const payload = isJson
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");

    if (!res.ok) {
      const msg =
        (isJson && payload && (payload as any).error) ||
        (typeof payload === "string" && payload) ||
        `HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    if (cacheEnabled) {
      writeCache(cacheConfig.key || endpoint, payload, cacheConfig.ttlMs);
    }

    return payload;
  } catch (err) {
    if (cacheEnabled && isNetworkOrTimeoutError(err)) {
      const cached = readCache(cacheConfig.key || endpoint);
      if (cached !== null) return cached;
    }
    throw err;
  }
}
