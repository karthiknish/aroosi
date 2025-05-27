import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function getTokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  convex.setAuth(token);
  // Only admin can list all interests
  const result = await convex.query(api.interests.listAllInterests, {});
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  convex.setAuth(token);
  const body = await req.json();
  const result = await convex.mutation(api.interests.sendInterest, body);
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  convex.setAuth(token);
  const body = await req.json();
  const result = await convex.mutation(api.interests.removeInterest, body);
  return NextResponse.json(result);
}
