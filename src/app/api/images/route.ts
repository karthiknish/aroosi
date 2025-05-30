import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  let body: { userId?: string; imageId?: string } = {};
  try {
    body = await req.json();
  } catch {}
  const { userId, imageId } = body;
  if (!userId || !imageId) {
    return NextResponse.json(
      { error: "Missing userId or imageId" },
      { status: 400 }
    );
  }
  // Call the Convex mutation to delete the image
  try {
    const result = await convex.mutation(api.images.deleteProfileImage, {
      userId: userId as Id<"users">,
      imageId: imageId as Id<"_storage">,
    });
    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: result.message || "Failed to delete image" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  let body: {
    userId?: string;
    storageId?: string;
    fileName?: string;
    contentType?: string;
    fileSize?: number;
  } = {};
  try {
    body = await req.json();
  } catch {}
  const { userId, storageId, fileName, contentType, fileSize } = body;
  if (!userId || !storageId || !fileName || !contentType || !fileSize) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }
  try {
    const result = await convex.mutation(api.images.uploadProfileImage, {
      userId: userId as Id<"users">,
      storageId: storageId as Id<"_storage">,
      fileName,
      contentType,
      fileSize,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
