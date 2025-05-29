import { NextRequest, NextResponse } from "next/server";

import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);

  const body = await req.json();
  const { fromUserId, toUserId } = body;
  if (
    !fromUserId ||
    !toUserId ||
    typeof fromUserId !== "string" ||
    typeof toUserId !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid or missing user IDs" },
      { status: 400 }
    );
  }

  const result = await convex.mutation(api.interests.removeInterest, {
    fromUserId: fromUserId as Id<"users">,
    toUserId: toUserId as Id<"users">,
  });
  return NextResponse.json(result);
}
