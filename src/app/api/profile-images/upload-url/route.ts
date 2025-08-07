import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { errorResponse } from "@/lib/apiResponse";
import {
  requireAuth,
  AuthError,
  authErrorResponse,
} from "@/lib/auth/requireAuth";
import { fetchMutation } from "convex/nextjs";

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

  const uploadUrl = await fetchMutation(api.images.generateUploadUrl, {} as any);
  if (!uploadUrl || typeof uploadUrl !== "string") {
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
  return NextResponse.json({ uploadUrl });
}
