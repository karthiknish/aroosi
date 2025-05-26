import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

// You may need to set this to your actual Convex deployment URL
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL as string;
const convexClient = new ConvexHttpClient(convexUrl);

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
          userId: userId as Id<"users">,
        });
        return res && res.profile ? { userId, profile: res.profile } : null;
      } catch {
        return null;
      }
    })
  );
  return NextResponse.json({ profiles: profiles.filter(Boolean) });
}
