import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const page = parseInt(searchParams.get("page") || "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const result = await convex.query(api.users.adminListProfiles, {
    search,
    page,
    pageSize,
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
  const body = await req.json();
  if (!body.id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const result = await convex.mutation(api.users.deleteProfile, {
    id: body.id,
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
  const body = await req.json();
  if (!body.id || !body.updates)
    return NextResponse.json(
      { error: "Missing id or updates" },
      { status: 400 }
    );
  const result = await convex.mutation(api.users.adminUpdateProfile, {
    id: body.id,
    updates: body.updates,
  });
  return NextResponse.json(result);
}
