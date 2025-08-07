import { NextRequest, NextResponse } from "next/server";
import { AuthError, authErrorResponse, requireAuth } from "@/lib/auth/requireAuth";
import { convexMutationWithAuth } from "@/lib/convexServer";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
  } catch (e) {
    if (e instanceof AuthError) {
      return authErrorResponse(e.message, { status: e.status, code: e.code });
    }
    return authErrorResponse("Authentication failed", {
      status: 401,
      code: "ACCESS_INVALID",
    });
  }

  const uploadUrl = await convexMutationWithAuth(
    req,
    (await import("@convex/_generated/api")).api.images.generateUploadUrl,
    {}
  );

  if (!uploadUrl || typeof uploadUrl !== "string") {
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
  return NextResponse.json({ uploadUrl });
}
