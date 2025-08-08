import { NextRequest } from "next/server";
import { api } from "@convex/_generated/api";
import { convexQueryWithAuth } from "@/lib/convexServer";
import { successResponse, errorResponse } from "@/lib/apiResponse";

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;
  if (!userId) return errorResponse("Missing userId", 400);
  try {
    const res = await convexQueryWithAuth(req, (api as any).compatibility.getCompatibility, { userId });
    return successResponse(res);
  } catch (e: unknown) {
    return errorResponse(e, 500);
  }
}
