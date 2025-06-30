// Admin API route for reordering profile images by profileId
import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { requireAdminToken } from "@/app/api/_utils/auth";
import { errorResponse } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  const adminCheck = requireAdminToken(req);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  const { token } = adminCheck;
  const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
  convex.setAuth(token);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { imageIds } = body;
  // Extract profileId from the URL
  const url = req.nextUrl || new URL(req.url);
  // The pathname will be something like /api/admin/profiles/[id]/images/order
  // Split and get the id
  const segments = url.pathname.split("/");
  // Find the index of 'profiles' and get the next segment as id
  const profilesIdx = segments.findIndex((s) => s === "profiles");
  const profileId = profilesIdx !== -1 ? segments[profilesIdx + 1] : undefined;
  if (
    !profileId ||
    !Array.isArray(imageIds) ||
    imageIds.some((id) => typeof id !== "string")
  ) {
    return NextResponse.json(
      { error: "Missing or invalid profileId or imageIds" },
      { status: 400 }
    );
  }
  try {
    // token already verified as admin
    // Call a Convex mutation to update the profile's image order
    const result = await convex.mutation(
      api.users.adminUpdateProfileImageOrder,
      {
        profileId: profileId as Id<"profiles">,
        imageIds: (imageIds as string[]).map((id) => id as Id<"_storage">),
      }
    );
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error)?.message || "Failed to reorder images" },
      { status: 500 }
    );
  }
}
 