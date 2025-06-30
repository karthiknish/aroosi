import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { requireAdminToken } from "@/app/api/_utils/auth";

export async function GET(req: NextRequest) {
  const adminCheck = requireAdminToken(req);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  const { token } = adminCheck;

  if (!process.env.NEXT_PUBLIC_CONVEX_URL)
    return NextResponse.json(
      { success: false, error: "Server config" },
      { status: 500 }
    );

  const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
  convex.setAuth(token);
  try {
    const profileId = req.nextUrl.pathname.split("/").slice(-2)[0] as string;
    const matches = await convex.query(api.users.getMatchesForProfile, {
      profileId: profileId as Id<"profiles">,
    });
    return NextResponse.json({ success: true, matches }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed" },
      { status: 500 }
    );
  }
}
