import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
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
  const { fromUserId, toUserId } = body;
  if (!fromUserId || !toUserId) {
    return NextResponse.json({ error: "Missing user IDs" }, { status: 400 });
  }

  const result = await convex.mutation(api.interests.removeInterest, {
    fromUserId: fromUserId as Id<"users">,
    toUserId: toUserId as Id<"users">,
  });
  return NextResponse.json(result);
}
