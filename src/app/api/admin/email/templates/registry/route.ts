import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { TEMPLATE_MAP } from "@/lib/marketingEmailTemplatesPublic";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;
  try {
    const list = Object.keys(TEMPLATE_MAP).map((key) => {
      const t = (TEMPLATE_MAP as any)[key];
      return {
        key,
        label: t?.label || key,
        category: t?.category || "general",
        argsDoc: t?.argsDoc || undefined,
      };
    });
    return successResponse({ templates: list });
  } catch (e) {
    return errorResponse("Failed to load registry", 500);
  }
}


