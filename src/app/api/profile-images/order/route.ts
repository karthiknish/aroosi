import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { errorResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
  convex.setAuth(token);
  let body: { profileId?: string; imageIds?: string[] } = {};
  try {
    body = await req.json();
  } catch {}
  const { profileId, imageIds } = body;
  if (!profileId || !Array.isArray(imageIds)) {
    return NextResponse.json(
      { error: "Missing profileId or imageIds" },
      { status: 400 }
    );
  }
  // For now treat profileId as userId to maintain existing behaviour
  try {
    const result = await convex.mutation(api.images.updateProfileImageOrder, {
      userId: profileId as Id<"users">,
      imageIds: imageIds as Id<"_storage">[],
    });
    if (result.success) return NextResponse.json({ success: true });
    return NextResponse.json(
      { error: result.message || "Failed to update order" },
      { status: 400 }
    );
  } catch (err) {
    console.error("/api/profile-images/order error", err);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
