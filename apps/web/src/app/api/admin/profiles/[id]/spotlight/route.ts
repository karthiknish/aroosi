import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { auth: clerkAuth } = await import("@clerk/nextjs/server");
    const authResult = await clerkAuth();
    const userId = authResult?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const isAdmin = user?.organizationMemberships?.[0]?.role === "org:admin";

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { hasSpotlightBadge, durationDays } = body;

    let result;
    
    if (hasSpotlightBadge) {
      // Grant spotlight badge
      result = await fetchMutation(api.users.adminGrantSpotlightBadge, {
        profileId: id as Id<"profiles">,
        durationDays: durationDays || 30
      });
    } else {
      // Remove spotlight badge
      result = await fetchMutation(api.users.adminRemoveSpotlightBadge, {
        profileId: id as Id<"profiles">
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating spotlight badge:", error);
    return NextResponse.json(
      { error: "Failed to update spotlight badge" },
      { status: 500 }
    );
  }
}