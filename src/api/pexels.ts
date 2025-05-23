export interface PexelsImage {
  id: number;
  src: { medium: string; large: string };
  alt: string;
}

export async function searchPexelsImages(
  query: string
): Promise<PexelsImage[]> {
  const apiKey = process.env.NEXT_PUBLIC_PEXELS_API_KEY;
  if (!apiKey) throw new Error("Pexels API key not set in env");
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`,
    {
      headers: { Authorization: apiKey },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch images from Pexels");
  const data = await res.json();
  return (data.photos || []).map((img: any) => ({
    id: img.id,
    src: { medium: img.src.medium, large: img.src.large },
    alt: img.alt,
  }));
}
