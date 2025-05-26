import { NextResponse } from "next/server";

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_API_URL = "https://api.pexels.com/v1/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter is required" },
      { status: 400 }
    );
  }

  if (!PEXELS_API_KEY) {
    return NextResponse.json(
      { error: "Pexels API key is not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${PEXELS_API_URL}?query=${encodeURIComponent(query)}&per_page=12`,
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

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error fetching images from Pexels:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}
