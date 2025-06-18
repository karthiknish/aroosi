import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { requireAdminToken } from "@/app/api/_utils/auth";

export async function GET(req: NextRequest) {
  const adminCheck = requireAdminToken(req);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  const { token } = adminCheck;
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token);
  const result = await convex.query(api.interests.listAllInterests, {});
  return NextResponse.json(result);
}
