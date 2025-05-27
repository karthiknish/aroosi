import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  convex.setAuth(token);
  // For now, just return all public profiles (filtering can be added as needed)
  const result = await convex.action(api.users.batchGetPublicProfiles, {
    userIds: [],
  });
  return NextResponse.json(result, {
    // headers: {
    //   "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    // },
  });
}
