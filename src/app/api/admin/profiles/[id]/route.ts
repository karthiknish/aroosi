import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;
  const { searchParams } = url;
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

export async function PUT(req: NextRequest) {
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
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;
  const updates = await req.json();
  if (!updates || typeof updates !== "object") {
    return NextResponse.json({ error: "Missing updates" }, { status: 400 });
  }
  const result = await convex.mutation(api.users.adminUpdateProfile, {
    id: id as unknown as Id<"profiles">,
    updates,
  });
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
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
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;
  const result = await convex.mutation(api.users.deleteProfile, {
    id: id as unknown as Id<"profiles">,
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
