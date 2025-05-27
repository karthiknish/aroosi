import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getTokenFromRequest(req);
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  const { id } = params;
  const { searchParams } = new URL(req.url);
  if (searchParams.get("matches")) {
    const result = await convex.query(api.users.getMatchesForProfile, {
      profileId: id as unknown as Id<"profiles">,
    });
    return NextResponse.json(result);
  }
  const result = await convex.query(api.users.getProfileById, {
    id: id as unknown as Id<"profiles">,
  });
  return NextResponse.json(result);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  const updates = await req.json();
  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "Missing updates" }, { status: 400 });
  }
  const result = await convex.mutation(api.users.adminUpdateProfile, {
    id: params.id as unknown as Id<"profiles">,
    updates,
  });
  return NextResponse.json(result);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, getToken } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = await getToken({ template: "convex" });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  const result = await convex.mutation(api.users.deleteProfile, {
    id: params.id as unknown as Id<"profiles">,
  });
  return NextResponse.json(result);
}

function getTokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;
  const [type, token] = auth.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}
