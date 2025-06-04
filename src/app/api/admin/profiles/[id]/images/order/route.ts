// Admin API route for reordering profile images by profileId
import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { requireAdmin } from "@convex/utils/requireAdmin";
import { Id } from "@convex/_generated/dataModel";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { imageIds } = body;
  const profileId = params.id;
  if (
    !profileId ||
    !Array.isArray(imageIds) ||
    imageIds.some((id) => typeof id !== "string")
  ) {
    return NextResponse.json(
      { error: "Missing or invalid profileId or imageIds" },
      { status: 400 }
    );
  }
  try {
    // Optionally require admin (if you have a util for this)
    await requireAdmin(token);
    // Call a Convex mutation to update the profile's image order
    const result = await convex.mutation(
      api.users.adminUpdateProfileImageOrder,
      {
        profileId: profileId as Id<"profiles">,
        imageIds: (imageIds as string[]).map((id) => id as Id<"_storage">),
      }
    );
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to reorder images" },
      { status: 500 }
    );
  }
}
