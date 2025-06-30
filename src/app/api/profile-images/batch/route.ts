import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { errorResponse } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const userIdsParam = url.searchParams.get("userIds");
  if (!userIdsParam) {
    return NextResponse.json({ error: "Missing userIds" }, { status: 400 });
  }
  const userIds = userIdsParam
    .split(",")
    .map((id) => id.trim()) as Id<"users">[];
  const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
  convex.setAuth(token);
  try {
    const result = await convex.query(api.images.batchGetProfileImages, {
      userIds,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("/api/profile-images/batch error", err);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}
