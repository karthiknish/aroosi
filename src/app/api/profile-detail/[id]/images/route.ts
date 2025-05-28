import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;

  // Convex IDs are 25-character strings by default, adjust if your IDs differ
  const isValidConvexId =
    typeof id === "string" && id.length === 25 && /^[a-zA-Z0-9_-]+$/.test(id);
  if (!isValidConvexId) {
    return NextResponse.json(
      { error: "Invalid or missing user ID" },
      { status: 400 }
    );
  }

  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
