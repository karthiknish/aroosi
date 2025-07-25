import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { errorResponse } from "@/lib/apiResponse";

function getToken(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const [t, token] = auth.split(" ");
  if (t !== "Bearer") return null;
  return token;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const token = getToken(req);
  if (!userId || !token)
    return NextResponse.json(
      { success: false, error: "Missing params" },
      { status: 400 },
    );
  const convex = getConvexClient();
  if (!convex) return errorResponse("Convex client not configured", 500);
  convex.setAuth(token);
  try {
    const counts = await convex.query(api.messages.getUnreadCountsForUser, {
      userId: userId as Id<"users">,
    });
    return NextResponse.json({ success: true, counts });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed" },
      { status: 500 },
    );
  }
}
