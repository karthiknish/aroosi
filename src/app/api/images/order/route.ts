import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "../../../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "../../../../../convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function PUT(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  convex.setAuth(token);
  const body = await req.json();
  // Convert string IDs to Convex Id types
  if (body.userId && typeof body.userId === "string") {
    body.userId = body.userId as Id<"users">;
  }
  if (Array.isArray(body.imageIds)) {
    body.imageIds = body.imageIds.map((id: string) => id as Id<"_storage">);
  }
  const result = await convex.mutation(
    api.images.updateProfileImageOrder,
    body
  );
  return NextResponse.json(result);
}
