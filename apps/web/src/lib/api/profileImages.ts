/**
 * Profile Images API - Handles profile image operations
 */

export interface ProfileImage {
  id: string;
  url: string;
  isMain?: boolean;
  order?: number;
  uploadedAt?: string;
}

export interface UploadResponse {
  imageId: string;
  url: string;
  uploadUrl?: string;
}

class ProfileImagesAPI {
  private async makeRequest(endpoint: string, options?: RequestInit): Promise<any> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    
    // Don't set Content-Type for FormData
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

    return payload;
  }

  /**
   * Get all profile images for current user
   */
  async getImages(): Promise<ProfileImage[]> {
    const res = await this.makeRequest("/api/profile-images");
    return res.data?.images || res.images || [];
  }

  /**
   * Upload a profile image
   */
  async upload(file: File, index?: number): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("image", file);
    if (index !== undefined) {
      formData.append("index", String(index));
    }

    return this.makeRequest("/api/profile-images/upload", {
      method: "POST",
      body: formData,
    });
  }

  /**
   * Confirm an uploaded image
   */
  async confirm(imageId: string): Promise<void> {
    return this.makeRequest("/api/profile-images/confirm", {
      method: "POST",
      body: JSON.stringify({ imageId }),
    });
  }

  /**
   * Delete a profile image
   */
  async delete(imageId: string): Promise<void> {
    return this.makeRequest("/api/profile-images", {
      method: "DELETE",
      body: JSON.stringify({ imageId }),
    });
  }

  /**
   * Reorder profile images
   */
  async reorder(imageIds: string[]): Promise<void> {
    return this.makeRequest("/api/profile-images/order", {
      method: "POST",
      body: JSON.stringify({ imageIds }),
    });
  }

  /**
   * Set main profile image
   */
  async setMain(imageId: string): Promise<void> {
    return this.makeRequest("/api/profile-images/main", {
      method: "POST",
      body: JSON.stringify({ imageId }),
    });
  }

  /**
   * Batch operations on images
   */
  async batch(operations: Array<{ action: string; imageId: string }>): Promise<void> {
    return this.makeRequest("/api/profile-images/batch", {
      method: "POST",
      body: JSON.stringify({ operations }),
    });
  }
}

export const profileImagesAPI = new ProfileImagesAPI();
