import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";

export async function POST(req: NextRequest) {
  const authCheck = requireUserToken(req);
  if ("errorResponse" in authCheck) return authCheck.errorResponse;
  const { token } = authCheck;
  let body: { interestId?: string; status?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const { interestId, status } = body;
  if (!interestId || (status !== "accepted" && status !== "rejected")) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid interestId or status" },
      { status: 400 }
    );
  }
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  convex.setAuth(token);
  try {
    const result = await convex.mutation(api.interests.respondToInterest, {
      interestId: interestId as Id<"interests">,
      status,
    });
    return successResponse(result);
  } catch (error) {
    return errorResponse(
      "Failed to respond to interest",
      500,
      process.env.NODE_ENV === "development"
        ? { details: error instanceof Error ? error.message : String(error) }
        : undefined
    );
  }
}
