import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

export async function PUT(req: NextRequest) {
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
  const { userId, imageIds } = body;
  if (
    !userId ||
    !Array.isArray(imageIds) ||
    imageIds.some((id) => typeof id !== "string")
  ) {
    return NextResponse.json(
      { error: "Missing or invalid userId or imageIds" },
      { status: 400 }
    );
  }
  try {
    const result = await convex.mutation(api.images.updateProfileImageOrder, {
      userId: userId as Id<"users">,
      imageIds: (imageIds as string[]).map((id) => id as Id<"_storage">),
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to reorder images" },
      { status: 500 }
    );
  }
}
