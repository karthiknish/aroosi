import { NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";

async function getTokenFromRequest(): Promise<string | null> {
  const { userId, getToken } = await auth();
  if (!userId) {
    return null;
  }
  return getToken({ template: "convex" });
}

export async function GET() {
  const token = await getTokenFromRequest();
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  // This query should return only the matches for the current user
  const result = await convex.query(api.users.getMyMatches, {});
  return NextResponse.json(result);
}
