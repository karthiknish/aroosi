import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexClient } from "@/lib/convexClient";
import { requireAdminToken } from "@/app/api/_utils/auth";
import { errorResponse } from "@/lib/apiResponse";

export async function GET(req: NextRequest) {
  const adminCheck = requireAdminToken(req);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  const { token } = adminCheck;
  const convex = getConvexClient();
    if (!convex) return errorResponse("Convex client not configured", 500);
  convex.setAuth(token);
  const result = await convex.query(api.interests.listAllInterests, {});
  return NextResponse.json(result);
}
