/**
 * Image search utilities for Pexels and other image services
 */

import { showErrorToast } from "@/lib/ui/toast";

export interface PexelsImage {
  id: number;
  url: string;
  photographer: string;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

export interface ImageSearchResponse {
  success: boolean;
  images?: PexelsImage[];
  totalResults?: number;
  page?: number;
  perPage?: number;
  error?: string;
  rateLimited?: boolean;
  timedOut?: boolean;
}

/**
 * Search for images using the Pexels API via our backend
 */
// Naive in-memory cache (query+page -> response) to cut duplicate network calls while user navigates pages
const imageSearchCache = new Map<string, ImageSearchResponse>();
let lastQueryTimestamp = 0;

export async function searchImages(
  query: string,
  page: number = 1,
  perPage: number = 15,
  force?: boolean
): Promise<ImageSearchResponse> {
  const q = query.trim();
  if (!q) return { success: true, images: [], totalResults: 0, page, perPage };
  const cacheKey = `${q}::${page}::${perPage}`;
  if (!force && imageSearchCache.has(cacheKey)) {
    return imageSearchCache.get(cacheKey)!;
  }
  try {
    const now = Date.now();
    // Basic throttle: if user is typing very fast, wait 150ms (debounce like) before executing
    if (now - lastQueryTimestamp < 100) {
      await new Promise((r) => setTimeout(r, 100));
    }
    lastQueryTimestamp = Date.now();

    const params = new URLSearchParams();
    params.set("query", q);
    params.set("page", String(page));
    params.set("per_page", String(perPage));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000); // 12s
    let response: Response;
    try {
      response = await fetch(`/api/search-images?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    let payload: any = null;
    try {
      const json = await response.json();
      payload =
        json && typeof json === "object" && "data" in json ? json.data : json;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const errMsg = payload?.error || `HTTP ${response.status}`;
      const rateLimited = response.status === 429 || /rate limit/i.test(errMsg);
      const res: ImageSearchResponse = {
        success: false,
        error: errMsg,
        rateLimited,
        page,
        perPage,
      };
      if (!rateLimited) showErrorToast(errMsg);
      return res;
    }

    const images = (payload?.images || payload?.photos || []) as PexelsImage[];
    const totalResults: number | undefined =
      typeof payload?.totalResults === "number" && payload.totalResults >= 0
        ? payload.totalResults
        : undefined;
    const result: ImageSearchResponse = {
      success: true,
      images,
      totalResults,
      page: payload?.page ?? page,
      perPage: payload?.perPage ?? perPage,
    };
    imageSearchCache.set(cacheKey, result);
    // Limit cache size
    if (imageSearchCache.size > 50) {
      const first = imageSearchCache.keys().next();
      if (!first.done && typeof first.value === "string") {
        imageSearchCache.delete(first.value);
      }
    }
    return result;
  } catch (error: any) {
    const aborted = error?.name === "AbortError";
    const errorMessage = aborted
      ? "Image search timed out"
      : error instanceof Error
        ? error.message
        : "Failed to search images";
    if (!aborted) showErrorToast(errorMessage);
    return {
      success: false,
      error: errorMessage,
      timedOut: aborted,
      page,
      perPage,
    };
  }
}