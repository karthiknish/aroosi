import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
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
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
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

export async function PUT_ban(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop()!;
  let body: { banned?: boolean } = {};
  try {
    body = await req.json();
  } catch {}
  if (typeof body.banned !== "boolean") {
    return NextResponse.json(
      { error: "Missing or invalid banned status" },
      { status: 400 }
    );
  }
  const profile = await convex.query(api.users.getProfileById, {
    id: id as unknown as Id<"profiles">,
  });
  if (!profile || !profile.userId) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  let result;
  if (body.banned) {
    result = await convex.mutation(api.users.banUser, {
      userId: profile.userId,
    });
  } else {
    result = await convex.mutation(api.users.unbanUser, {
      userId: profile.userId,
    });
  }
  return NextResponse.json(result);
}
