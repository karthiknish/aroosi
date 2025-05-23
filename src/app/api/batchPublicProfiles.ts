import { NextRequest, NextResponse } from "next/server";
import { api } from "@/../convex/_generated/api";
import { convexClient } from "@/../convex/_generated/client";

export async function POST(req: NextRequest) {
  const { userIds } = await req.json();
  if (!Array.isArray(userIds)) {
    return NextResponse.json({ profiles: [] });
  }
  // Fetch all profiles in parallel using Convex client
  const profiles = await Promise.all(
    userIds.map(async (userId: string) => {
      try {
        const res = await convexClient.query(api.users.getUserPublicProfile, {
          userId,
        });
        return res && res.profile ? { userId, profile: res.profile } : null;
      } catch {
        return null;
      }
    })
  );
  return NextResponse.json({ profiles: profiles.filter(Boolean) });
}
