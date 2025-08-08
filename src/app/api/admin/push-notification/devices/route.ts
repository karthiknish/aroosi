import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

export async function GET(request: NextRequest) {
  const { role } = await requireAuth(request as unknown as NextRequest);
  if ((role || "user") !== "admin")
    return errorResponse("Admin privileges required", 403);

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const page = Number(url.searchParams.get("page") || "1");
  const pageSize = Number(url.searchParams.get("pageSize") || "20");

  const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";
  if (!CONVEX_URL) return errorResponse("Convex not configured", 500);

  const cookieHeader = request.headers.get("cookie") || "";
  const client = new ConvexHttpClient(CONVEX_URL);
  try {
    const data = await (client as any).query(
      (api as any).pushNotifications.adminListPushDevices,
      { search, page, pageSize },
      { headers: { cookie: cookieHeader } }
    );
    return successResponse(data);
  } catch (err) {
    console.error("admin devices list error", err);
    return errorResponse("Failed to list devices", 500);
  }
}
