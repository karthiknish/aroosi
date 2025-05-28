import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

export async function GET(req: NextRequest) {
  // Require authentication
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  const { searchParams } = new URL(req.url);
  const userIdsParam = searchParams.get("userIds");
  if (!userIdsParam) {
    return NextResponse.json({});
  }
  const userIds = userIdsParam.split(",").filter(Boolean) as Id<"users">[];
  if (userIds.length === 0) {
    return NextResponse.json({});
  }
  const result = await convex.query(api.images.batchGetProfileImages, {
    userIds,
  });
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
