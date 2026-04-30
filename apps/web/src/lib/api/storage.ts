/**
 * Storage API - Handles file storage operations
 */

import { getResponseMessage, isApiEnvelope } from "@/lib/api/safeRequest";

type SignedUrlResponse = {
  url?: string;
};

type SearchImagesResponse = {
  images?: string[];
};

class StorageAPI {
  private async makeRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers = new Headers({
      Accept: "application/json",
    });
    
    if (options?.body && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    if (options?.headers) {
      new Headers(options.headers).forEach((value, key) => headers.set(key, value));
    }

    const res = await fetch(endpoint, {
      method: options?.method || "GET",
      headers,
      body: options?.body,
      credentials: "include",
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.toLowerCase().includes("application/json");
    const payload: unknown = isJson
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(getResponseMessage(payload) ?? `HTTP ${res.status}`);
    }

    if (isApiEnvelope<T>(payload)) {
      if (payload.success === false) {
        throw new Error(getResponseMessage(payload) ?? "Request failed");
      }

      if ("data" in payload) {
        return payload.data as T;
      }
    }

    return payload as T;
  }

  /**
   * Get a signed URL for a storage path
   */
  async getSignedUrl(path: string): Promise<string> {
    const res = await this.makeRequest<SignedUrlResponse>(`/api/storage/${encodeURIComponent(path)}`);
    return res.url ?? "";
  }

  /**
   * Search for images (e.g., for blog posts)
   */
  async searchImages(query: string, limit = 10): Promise<{ images: string[] }> {
    const res = await this.makeRequest<SearchImagesResponse>(
      `/api/search-images?q=${encodeURIComponent(query)}&limit=${limit}`
    );
    return {
      images: res.images ?? [],
    };
  }
}

export const storageAPI = new StorageAPI();
