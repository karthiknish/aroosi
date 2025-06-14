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
  const rawIds = userIdsParam.split(",").filter(Boolean);
  const MAX_BATCH = 50;
  if (rawIds.length === 0) {
    return NextResponse.json({});
  }

  if (rawIds.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `You can request up to ${MAX_BATCH} users at a time` },
      { status: 400 }
    );
  }

  // Validate each ID format (basic Convex ID regex)
  const invalidId = rawIds.find((id) => !/^[a-z0-9]+$/.test(id));
  if (invalidId) {
    return NextResponse.json(
      { error: `Invalid user ID: ${invalidId}` },
      { status: 400 }
    );
  }

  const userIds = rawIds as Id<"users">[];
  const result = await convex.query(api.images.batchGetProfileImages, {
    userIds,
  });
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
