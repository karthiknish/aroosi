import { NextRequest } from "next/server";
import { requireAdminSession } from "@/app/api/_utils/auth";
import { successResponse, errorResponse } from "@/lib/api/handler";
import { TEMPLATE_MAP } from "@/lib/marketingEmailTemplatesPublic";

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdminSession(request);
  if ("errorResponse" in adminCheck) return adminCheck.errorResponse;

  try {
    // Source of truth: marketing templates public map
    // This endpoint is used by the marketing email UI dropdown, so we only return marketing templates here.
    const templates = Object.keys(TEMPLATE_MAP)
      // Exclude builder-only template from the marketing dropdown until the builder flow is implemented
      .filter((key) => key !== "builder" && (TEMPLATE_MAP as any)[key]?.category !== "builder")
      .map((key) => {
        const t = (TEMPLATE_MAP as any)[key] as {
          label?: string;
          category?: string;
        };
        return {
          key,
          label: t?.label || key,
          category: t?.category || "general",
        };
      });

    return successResponse({ templates });
  } catch (e) {
    return errorResponse("Failed to list templates", 500);
  }
}


