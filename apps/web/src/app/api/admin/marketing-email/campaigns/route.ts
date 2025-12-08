import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { db } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || 20)));
    const offset = Math.max(0, Number(searchParams.get("offset") || 0));

    const ref = db.collection("marketing_email_campaigns").orderBy("createdAt", "desc").limit(limit + offset);
    const snap = await ref.get();
    const all = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }));
    const items = all.slice(offset, offset + limit);
    return successResponse({ campaigns: items, total: all.length });
  } catch (e) {
    return errorResponse("Failed to fetch campaigns", 500);
  }
}
