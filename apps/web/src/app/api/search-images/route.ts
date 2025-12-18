import {
  createAuthenticatedHandler,
  successResponse,
  errorResponse,
  ApiContext
} from "@/lib/api/handler";

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_API_URL = "https://api.pexels.com/v1/search";

export const GET = createAuthenticatedHandler(
  async (ctx: ApiContext) => {
    const userId = (ctx.user as any).userId || (ctx.user as any).id;
    const { searchParams } = new URL(ctx.request.url);
    
    const query = searchParams.get("query");
    const pageParam = searchParams.get("page");
    const perPageParam = searchParams.get("per_page");

    if (!query) {
      return errorResponse("Query parameter is required", 400, { correlationId: ctx.correlationId });
    }

    // Input validation and sanitization
    const sanitizedQuery = query.trim().replace(/[<>'"&]/g, "");
    if (!sanitizedQuery || sanitizedQuery.length < 2) {
      return errorResponse("Invalid query parameter", 400, { correlationId: ctx.correlationId });
    }

    if (sanitizedQuery.length > 100) {
      return errorResponse("Query too long", 400, { correlationId: ctx.correlationId });
    }

    if (!PEXELS_API_KEY) {
      return errorResponse("Image search service temporarily unavailable", 503, { correlationId: ctx.correlationId });
    }

    try {
      const page = Math.max(1, Math.min(50, Number(pageParam) || 1));
      const perPage = Math.max(1, Math.min(80, Number(perPageParam) || 12));

      const response = await fetch(
        `${PEXELS_API_URL}?query=${encodeURIComponent(sanitizedQuery)}&per_page=${perPage}&page=${page}&orientation=landscape`,
        {
          headers: { Authorization: PEXELS_API_KEY },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        console.error(`Pexels API error: ${response.status} ${response.statusText}`);
        if (response.status === 429) {
          return errorResponse("Image search service rate limited", 503, { correlationId: ctx.correlationId });
        }
        if (response.status >= 500) {
          return errorResponse("Image search service temporarily unavailable", 503, { correlationId: ctx.correlationId });
        }
        throw new Error(`Failed to fetch images from Pexels: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.photos)) {
        console.error("Invalid response from Pexels API:", data);
        return errorResponse("Invalid response from image service", 500, { correlationId: ctx.correlationId });
      }

      const images = data.photos
        .filter((photo: any) => photo && photo.id && photo.src?.medium && photo.src?.large)
        .slice(0, 12)
        .map((photo: any) => ({
          id: photo.id,
          src: { medium: photo.src.medium, large: photo.src.large },
          alt: (photo.alt || "Image from Pexels").substring(0, 200),
        }));

      return successResponse({
        images,
        query: sanitizedQuery,
        totalResults: typeof data.total_results === "number" ? data.total_results : images.length,
        page,
        perPage,
      }, 200, ctx.correlationId);
    } catch (error) {
      console.error("search-images error", { error, correlationId: ctx.correlationId });
      if (error instanceof Error && error.name === "AbortError") {
        return errorResponse("Image search request timed out", 408, { correlationId: ctx.correlationId });
      }
      return errorResponse("Failed to fetch images", 500, { correlationId: ctx.correlationId });
    }
  },
  {
    rateLimit: { identifier: "search_images", maxRequests: 50 }
  }
);
