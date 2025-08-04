import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { Id } from "@convex/_generated/dataModel";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireSession } from "@/app/api/_utils/auth";

export async function POST(req: NextRequest) {
  // Cookie-only authentication
  const session = await requireSession(req);
  if ("errorResponse" in session) return session.errorResponse;
  const { userId } = session;

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

  const convex = getConvexClient();
  if (!convex) return errorResponse("Convex client not configured", 500);
  // No convex.setAuth(token) in cookie-only model

  try {
    const result = await convex.mutation(api.interests.respondToInterest, {
      interestId: interestId as Id<"interests">,
      status,
      // If the mutation requires caller identity, Convex will read it from cookies on the server
      // Include userId if your mutation input expects it
      userId: userId as Id<"users">,
    } as any);
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
