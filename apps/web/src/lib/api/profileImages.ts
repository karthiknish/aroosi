/**
 * Profile Images API - Handles profile image operations
 */

import { safeRequest } from "@/lib/api/safeRequest";

export interface ProfileImage {
  id: string;
  url: string;
  isMain?: boolean;
  order?: number;
  uploadedAt?: string | number;
}

export interface UploadResponse {
  imageId: string;
  url: string;
  uploadUrl?: string;
}

export interface ConfirmUploadParams {
  fileName: string;
  uploadId: string;
}

class ProfileImagesAPI {
  private async makeRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
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

    return safeRequest(
      endpoint,
      {
        method: options?.method || "GET",
        headers: finalHeaders,
        body: options?.body,
        credentials: "include",
      },
      {
        timeoutMs: 20_000,
        cache: { ttlMs: 5 * 60_000 },
      }
    ) as Promise<T>;
  }

  /**
   * Get all profile images for current user
   */
  async getImages(): Promise<ProfileImage[]> {
    const res = await this.makeRequest<{ data?: { images?: ProfileImage[] }; images?: ProfileImage[] }>("/api/profile-images");
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
  async confirm(params: ConfirmUploadParams): Promise<void> {
    return this.makeRequest("/api/profile-images/confirm", {
      method: "POST",
      body: JSON.stringify(params),
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
      method: "PUT",
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
