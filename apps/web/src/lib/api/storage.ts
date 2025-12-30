/**
 * Storage API - Handles file storage operations
 */

class StorageAPI {
  private async makeRequest(endpoint: string, options?: RequestInit): Promise<any> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    
    if (options?.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const finalHeaders: Record<string, string> =
      options?.headers && !(options.headers instanceof Headers) && !Array.isArray(options.headers)
        ? { ...headers, ...(options.headers as Record<string, string>) }
        : headers;

    const res = await fetch(endpoint, {
      method: options?.method || "GET",
      headers: finalHeaders,
      body: options?.body,
      credentials: "include",
    });

    const ct = res.headers.get("content-type") || "";
    const isJson = ct.toLowerCase().includes("application/json");
    const payload = isJson ? await res.json().catch(() => ({})) : await res.text().catch(() => "");

    if (!res.ok) {
      const msg =
        (isJson && payload && (payload as any).error) ||
        (typeof payload === "string" && payload) ||
        `HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    // Unwrap standardized { success, data } envelope from API handler
    if (isJson && payload && typeof payload === "object") {
      const maybe = payload as any;
      if ("success" in maybe) {
        if (maybe.success === false) {
          throw new Error(String(maybe.message || maybe.error || "Request failed"));
        }
        if ("data" in maybe) {
          return maybe.data;
        }
      }
    }

    return payload;
  }

  /**
   * Get a signed URL for a storage path
   */
  async getSignedUrl(path: string): Promise<string> {
    const res = await this.makeRequest(`/api/storage/${encodeURIComponent(path)}`);
    return res.data?.url || res.url || "";
  }

  /**
   * Search for images (e.g., for blog posts)
   */
  async searchImages(query: string, limit = 10): Promise<{ images: string[] }> {
    const res = await this.makeRequest(`/api/search-images?q=${encodeURIComponent(query)}&limit=${limit}`);
    return {
      images: res.data?.images || res.images || [],
    };
  }
}

export const storageAPI = new StorageAPI();
