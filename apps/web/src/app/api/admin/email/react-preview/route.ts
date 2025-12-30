import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/api/handler";
import { renderMarketingReactTemplate } from "@/lib/reactEmailRenderers";

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  try {
    const body = await request.json();
    const templateKey = String(body?.templateKey || "");
    const args = body?.args || {};
    const profile = body?.profile || { fullName: "Friend" };
    const unsubscribeToken = body?.unsubscribeToken || "preview-token";
    if (!templateKey) return errorResponse("Missing templateKey", 400);
    const res = renderMarketingReactTemplate(templateKey, args, { profile, unsubscribeToken });
    if (!res) return errorResponse("Unknown templateKey or not supported for React rendering", 400);
    return successResponse({ subject: res.subject, html: res.html });
  } catch (e) {
    return errorResponse("Failed to render preview", 500);
  }
}
