import { NextRequest, NextResponse } from "next/server";
import { api } from "@/../convex/_generated/api";
import { convexClientFromRequest } from "@/lib/convexClient";
import type { Id } from "@/../convex/_generated/dataModel";

/**
 * POST  /api/profile/view
 *   Body: { profileId: string }
 *   Records that the authenticated user viewed the given profile.
 *
 * GET   /api/profile/view?profileId=xyz
 *   Returns the list of viewers for the given profile (Premium Plus owner only).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId } = body ?? {};

    if (!profileId) {
      return NextResponse.json(
        { success: false, error: "Missing profileId" },
        { status: 400 }
      );
    }

    const tmpClient = await convexClientFromRequest(request);
    if (!tmpClient) {
      return NextResponse.json(
        { success: false, error: "Convex backend not configured" },
        { status: 500 }
      );
    }
    const client = tmpClient;
    await client.mutation(api.users.recordProfileView, {
      profileId,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("recordProfileView error", error);
    const message =
      error instanceof Error ? error.message : "Failed to record view";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId");

    if (!profileId) {
      return NextResponse.json(
        { success: false, error: "Missing profileId" },
        { status: 400 }
      );
    }

    const tmpClient = await convexClientFromRequest(request);
    if (!tmpClient) {
      return NextResponse.json(
        { success: false, error: "Convex backend not configured" },
        { status: 500 }
      );
    }
    const client = tmpClient;
    const viewers = await client.query(api.users.getProfileViewers, {
      profileId: profileId as Id<"profiles">,
    });

    return NextResponse.json({ success: true, viewers });
  } catch (error: unknown) {
    console.error("getProfileViewers error", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch viewers";
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}
