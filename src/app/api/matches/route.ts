import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  // This query should return only the matches for the current user
  const result = await convex.query(api.users.getMyMatches, {});
  return NextResponse.json(result);
}
