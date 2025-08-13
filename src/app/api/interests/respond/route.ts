import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/auth/requireAuth";
import { convexMutationWithAuth } from "@/lib/convexServer";

export async function POST(req: NextRequest) {
  const { userId } = await requireAuth(req);

  // Parse and validate body
  let body: { interestId?: string; status?: "accepted" | "rejected" } = {};
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

  // Basic env/config sanity
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const result = await convexMutationWithAuth(
      req,
      api.interests.respondToInterest,
      {
        interestId: interestId as Id<"interests">,
        status,
        userId: userId as Id<"users">,
      } as any
    );
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


