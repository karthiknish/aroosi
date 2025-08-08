import { NextRequest } from "next/server";
// import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/auth/requireAuth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { z } from "zod";
import { convexQueryWithAuth } from "@/lib/convexServer";
import { api as convexApi } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

// type Gender = "any" | "male" | "female" | "other";

// Sanitized bounded string: trims, strips risky chars, 2..50
const SanStr = z
  .string()
  .trim()
  .transform((v) => v.replace(/[<>'"&]/g, ""))
  .pipe(z.string().min(2).max(50));

const QuerySchema = z.object({
  city: SanStr.optional(),
  country: SanStr.optional(),
  ethnicity: SanStr.optional(),
  motherTongue: SanStr.optional(),
  language: SanStr.optional(),
  preferredGender: z.enum(["any", "male", "female", "other"]).optional(),
  ageMin: z.coerce.number().int().min(18).max(120).optional(),
  ageMax: z.coerce.number().int().min(18).max(120).optional(),
  page: z.coerce.number().int().min(0).max(100).default(0),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export async function GET(request: NextRequest) {
  try {
    // Correlation ID for cross-tier tracing
    const cid =
      request.headers.get("x-correlation-id") ??
      (() => {
        try {
          return crypto.randomUUID();
        } catch {
          // Fallback unique-ish
          return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        }
      })();

    // Cookie-session auth; keep bearer extraction only if a limiter depends on it
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization") ||
      "";
    const bearerToken = (() => {
      const parts = authHeader.trim().split(/\s+/);
      const scheme = parts[0]?.toLowerCase();
      const token = parts.slice(1).join(" ").trim();
      return scheme === "bearer" && token ? token : null;
    })();

    const { userId } = await requireAuth(request);

    if (!userId) {
      return errorResponse("User ID is required", 400);
    }

    // 1) Coarse per-user burst limiter (e.g. 60/min) to protect infra
    const burstKey = `search:${userId}`;
    const burstLimit = checkApiRateLimit(burstKey, 60, 60_000);
    if (!burstLimit.allowed) {
      return errorResponse("Rate limit exceeded. Please slow down.", 429);
    }

    // 2) Plan enforcement: premium filters require Premium (or higher)
    try {
      const meProfile = await convexQueryWithAuth(
        request,
        convexApi.profiles.getProfileByUserId,
        { userId: userId as Id<"users"> }
      );
      const plan = (meProfile as any)?.subscriptionPlan ?? "free";
      const hasAdvancedFilters = plan === "premium" || plan === "premiumPlus";
      const url = new URL(request.url);
      const hasPremiumParams =
        url.searchParams.has("ethnicity") ||
        url.searchParams.has("motherTongue") ||
        url.searchParams.has("language");
      if (hasPremiumParams && !hasAdvancedFilters) {
        return errorResponse(
          "Advanced filters require a Premium subscription",
          403
        );
      }
    } catch {
      // If the profile cannot be loaded, fail closed to avoid leaking feature access
      return errorResponse("Authorization failed", 403);
    }

    // 3) Subscription-aware limiter for plan entitlements
    const subscriptionRateLimit =
      await subscriptionRateLimiter.checkSubscriptionRateLimit(
        request,
        bearerToken || "", // pass actual Bearer access token if limiter expects token; otherwise can be ignored internally
        userId,
        "search_performed"
      );
    if (!subscriptionRateLimit.allowed) {
      return errorResponse(
        subscriptionRateLimit.error || "Subscription limit exceeded",
        429
      );
    }

    // 4) Parse and validate with Zod
    const { searchParams } = new URL(request.url);
    const paramsObj = Object.fromEntries(searchParams.entries());
    const parsed = QuerySchema.safeParse(paramsObj);
    if (!parsed.success) {
      if (process.env.NODE_ENV === "development") {
        console.warn("search.api validation failed", {
          correlationId: cid,
          issues: parsed.error.issues,
        });
      }
      return errorResponse("Invalid parameters", 400);
    }
    const {
      city,
      country,
      ethnicity,
      motherTongue,
      language,
      preferredGender,
      ageMin,
      ageMax,
      page,
      pageSize,
    } = parsed.data;

    // Cross-field validation: ageMin <= ageMax
    if (
      typeof ageMin === "number" &&
      typeof ageMax === "number" &&
      ageMin > ageMax
    ) {
      return errorResponse(
        "Minimum age cannot be greater than maximum age",
        400
      );
    }

    const t0 = Date.now();

    // Convex query via cookie-aware server helper
    const result = await convexQueryWithAuth(
      request,
      (await import("@convex/_generated/api")).api.users.searchPublicProfiles,
      {
        city,
        country,
        ageMin,
        ageMax,
        preferredGender,
        page,
        pageSize,
        ethnicity,
        motherTongue,
        language,
        viewerUserId: userId as Id<"users">,
        correlationId: cid,
      }
    ).catch((e: unknown) => {
      console.error("searchPublicProfiles failed", {
        scope: "search",
        correlationId: cid,
        message: e instanceof Error ? e.message : String(e),
      });
      return null;
    });

    if (!result || typeof result !== "object") {
      console.error("Invalid search results from Convex:", result, {
        scope: "search",
        correlationId: cid,
      });
      return errorResponse("Search service error", 500);
    }

    const _latencyMs = Date.now() - t0;

    // Forward any cookies updated during session refresh
    return successResponse({
      ...result,
      page,
      pageSize,
      correlationId: cid,
      searchParams: {
        city,
        country,
        ageMin,
        ageMax,
        preferredGender,
        ethnicity,
        motherTongue,
        language,
      },
    });
  } catch (error) {
    console.error("Error in search API route:", error);

    // Standardize auth failures from requireAuth
    const { AuthError, authErrorResponse } = await import(
      "@/lib/auth/requireAuth"
    );
    if (error instanceof AuthError) {
      return authErrorResponse(error.message, {
        status: error.status,
        code: error.code,
      });
    }

    if (
      error instanceof Error &&
      (error.message.includes("AUTHENTICATION_ERROR") ||
        error.message.includes("Unauthenticated"))
    ) {
      return errorResponse("Authentication failed. Please log in again.", 401);
    }

    const errorMessage =
      process.env.NODE_ENV === "development"
        ? error instanceof Error
          ? error.message
          : "Unknown error"
        : "Search service temporarily unavailable";

    return errorResponse(errorMessage, 500);
  }
}
