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
  token: string,
  query: string,
  page: number = 1,
  perPage: number = 15
): Promise<ImageSearchResponse> {
  try {
    const response = await fetch("/api/search-images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Cookie-based session; no Authorization header
      },
      body: JSON.stringify({
        query,
        page,
        per_page: perPage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      images: data.photos || [],
    };
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