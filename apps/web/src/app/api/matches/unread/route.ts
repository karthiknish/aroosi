import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

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
      { status: 400 }
    );
  if (!process.env.NEXT_PUBLIC_CONVEX_URL)
    return NextResponse.json(
      { success: false, error: "Server" },
      { status: 500 }
    );
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);
  try {
    const counts = await convex.query(api.messages.getUnreadCountsForUser, {
      userId: userId as Id<"users">,
    });
    return NextResponse.json({ success: true, counts });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed" },
      { status: 500 }
    );
  }
}
