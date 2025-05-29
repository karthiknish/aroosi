import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";

export async function POST(req: NextRequest) {
  const { userIds } = await req.json();

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json([], { status: 200 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);

  // Fetch all profiles in parallel
  const results = await Promise.all(
    userIds.map(async (userId: string) => {
      try {
        const res = await convex.query(api.users.getUserPublicProfile, {
          userId: userId as Id<"users">,
        });
        if (res && res.profile) {
          return { userId, profile: res.profile };
        }
      } catch (e) {
        // ignore errors for individual users
      }
      return null;
    })
  );

  // Filter out nulls
  return NextResponse.json(results.filter(Boolean), { status: 200 });
}
