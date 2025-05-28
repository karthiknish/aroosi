import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const segments = url.pathname.split("/");
  let id = segments[segments.length - 2];
  if (id === "images") {
    id = segments[segments.length - 3];
  }
  if (!id) {
    return NextResponse.json(
      { error: `Invalid or missing user ID: [${id}]` },
      { status: 400 }
    );
  }
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  const viewedUserId = id as Id<"users">;
  const result = await convex.action(api.users.getProfileDetailPageData, {
    viewedUserId,
  });
  // Only return image-related fields
  const { userProfileImages, userImages, currentUserProfileImagesData, error } =
    result;
  return NextResponse.json(
    {
      userProfileImages,
      userImages,
      currentUserProfileImagesData,
      ...(error ? { error } : {}),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}
