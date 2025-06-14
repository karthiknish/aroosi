import {} from "next/server";
import { successResponse, errorResponse } from "@/lib/apiResponse";

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_API_URL = "https://api.pexels.com/v1/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return errorResponse("Query parameter is required", 400);
  }

  if (!PEXELS_API_KEY) {
    return errorResponse("Pexels API key is not configured", 500);
  }

  try {
    const response = await fetch(
      `${PEXELS_API_URL}?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch images from Pexels");
    }

    const data = await response.json();
    const images = data.photos.map(
      (photo: {
        id: number;
        src: { medium: string; large: string };
        alt: string;
      }) => ({
        id: photo.id,
        src: {
          medium: photo.src.medium,
          large: photo.src.large,
        },
        alt: photo.alt || "Image from Pexels",
      })
    );

    return successResponse({ images });
  } catch (error) {
    console.error("Error fetching images from Pexels:", error);
    return errorResponse("Failed to fetch images", 500);
  }
}
