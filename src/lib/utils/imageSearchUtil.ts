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
  error?: string;
}

/**
 * Search for images using the Pexels API via our backend
 */
export async function searchImages(
  query: string,
  page: number = 1,
  perPage: number = 15
): Promise<ImageSearchResponse> {
  try {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (page) params.set("page", String(page));
    if (perPage) params.set("per_page", String(perPage));

    const response = await fetch(`/api/search-images?${params.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const json = await response.json();
    const payload = json && typeof json === "object" && "data" in json ? json.data : json;
    const images = (payload?.images || payload?.photos || []) as PexelsImage[];
    return { success: true, images };
  } catch (error) {
    console.error("Failed to search images:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to search images";
    showErrorToast(errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}