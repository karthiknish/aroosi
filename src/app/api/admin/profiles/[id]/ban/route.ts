import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { Notifications } from "@/lib/notify";
import type { Profile as AppProfile } from "@/types/profile";

export async function PUT(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
  convex.setAuth(token);
  const url = new URL(req.url);
  const id = url.pathname.split("/").slice(-2, -1)[0]!; // get the [id] param from /profiles/[id]/ban
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
    if (profile.email) {
      await Notifications.profileBanStatus(profile.email, {
        profile: profile as AppProfile,
        banned: true,
      });
    }
  } else {
    result = await convex.mutation(api.users.unbanUser, {
      userId: profile.userId,
    });
    if (profile.email) {
      await Notifications.profileBanStatus(profile.email, {
        profile: profile as AppProfile,
        banned: false,
      });
    }
  }
  return NextResponse.json(result);
}
