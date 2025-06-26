import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_API_URL = "https://api.pexels.com/v1/search";

export async function GET(request: NextRequest) {
  try {
    // Enhanced authentication
    const authCheck = requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { userId } = authCheck;

    // Rate limiting
    const rateLimitResult = checkApiRateLimit(`search_images_${userId}`, 50, 60000); // 50 searches per minute
    if (!rateLimitResult.allowed) {
      return errorResponse("Rate limit exceeded", 429);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return errorResponse("Query parameter is required", 400);
    }

    // Input validation and sanitization
    const sanitizedQuery = query.trim().replace(/[<>'\"&]/g, '');
    if (!sanitizedQuery || sanitizedQuery.length < 2) {
      return errorResponse("Invalid query parameter", 400);
    }

    if (sanitizedQuery.length > 100) {
      return errorResponse("Query too long", 400);
    }

    if (!PEXELS_API_KEY) {
      return errorResponse("Image search service temporarily unavailable", 503);
    }

    // Log image search for monitoring
    console.log(`Image search by user ${userId}: "${sanitizedQuery}"`);

    const response = await fetch(
      `${PEXELS_API_URL}?query=${encodeURIComponent(sanitizedQuery)}&per_page=12&orientation=landscape`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    );

    if (!response.ok) {
      console.error(`Pexels API error: ${response.status} ${response.statusText}`);
      
      if (response.status === 429) {
        return errorResponse("Image search service rate limited", 503);
      }
      
      if (response.status >= 500) {
        return errorResponse("Image search service temporarily unavailable", 503);
      }
      
      throw new Error(`Failed to fetch images from Pexels: ${response.status}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data || !Array.isArray(data.photos)) {
      console.error("Invalid response from Pexels API:", data);
      return errorResponse("Invalid response from image service", 500);
    }

    // Filter and sanitize image data
    const images = data.photos
      .filter((photo: unknown) => {
        const p = photo as { id?: number; src?: { medium?: string; large?: string } };
        return p && p.id && p.src?.medium && p.src?.large;
      })
      .slice(0, 12) // Limit results
      .map((photo: {
        id: number;
        src: { medium: string; large: string };
        alt: string;
      }) => ({
        id: photo.id,
        src: {
          medium: photo.src.medium,
          large: photo.src.large,
        },
        alt: (photo.alt || "Image from Pexels").substring(0, 200), // Limit alt text length
      }));

    return successResponse({ 
      images,
      query: sanitizedQuery,
      totalResults: images.length 
    });

  } catch (error) {
    console.error("Error fetching images from Pexels:", error);
    
    // Log security event for monitoring
    // logSecurityEvent('VALIDATION_FAILED', { 
    //   userId: userId || 'unknown', 
    //   endpoint: 'search-images',
    //   error: error instanceof Error ? error.message : 'Unknown error'
    // }, request);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return errorResponse("Image search request timed out", 408);
    }
    
    return errorResponse("Failed to fetch images", 500);
  }
}
