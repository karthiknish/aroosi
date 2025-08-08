import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { convexQueryWithAuth } from "@/lib/convexServer";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") || undefined;
  const limit = searchParams.get("limit");
  try {
    const res = await convexQueryWithAuth(
      request,
      (api as any).recommendations.getRecommendations,
      {
        cursor,
        limit: limit ? Number(limit) : undefined,
      }
    );
    return new Response(JSON.stringify(res), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch recommendations" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
