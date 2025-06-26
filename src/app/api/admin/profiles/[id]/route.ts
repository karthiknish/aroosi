import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";
import { Notifications } from "@/lib/notify";
import type { Profile as AppProfile } from "@/types/profile";

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

  // Determine if approval or subscription change
  try {
    const updated = await convex.query(api.users.getProfileById, {
      id: id as unknown as Id<"profiles">,
    });
    const profile = updated as AppProfile;
    if (profile && profile.email) {

      if (
        updates.subscriptionPlan &&
        typeof updates.subscriptionPlan === "string"
      ) {
        await Notifications.subscriptionChanged(
          profile.email,
          profile.fullName || profile.email,
          updates.subscriptionPlan as string
        );
      }
    }
  } catch (e) {
    console.error("admin profile notify error", e);
  }

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


