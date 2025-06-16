import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
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
