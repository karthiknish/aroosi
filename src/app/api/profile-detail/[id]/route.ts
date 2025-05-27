import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;
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
  // Only return text/profile data, not images
  const {
    currentUser,
    profileData,
    isBlocked,
    isMutualInterest,
    sentInterest,
    error,
  } = result;
  return NextResponse.json(
    {
      currentUser,
      profileData,
      isBlocked,
      isMutualInterest,
      sentInterest,
      ...(error ? { error } : {}),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}
