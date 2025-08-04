import { NextRequest } from "next/server";
import { getConvexClient } from "@/lib/convexClient";
import { api } from "@convex/_generated/api";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireUserToken } from "@/app/api/_utils/auth";
import { checkApiRateLimit } from "@/lib/utils/securityHeaders";
import { subscriptionRateLimiter } from "@/lib/utils/subscriptionRateLimit";
import { z } from "zod";

type Gender = "any" | "male" | "female" | "other";

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

    // Authentication (cookie-only)
    const authCheck = await requireUserToken(request);
    if ("errorResponse" in authCheck) return authCheck.errorResponse;
    const { userId } = authCheck;

    if (!userId) {
      return errorResponse("User ID is required", 400);
    }

    // 1) Coarse per-user burst limiter (e.g. 60/min) to protect infra
    const burstKey = `search:${userId}`;
    const burstLimit = checkApiRateLimit(burstKey, 60, 60_000);
    if (!burstLimit.allowed) {
      return errorResponse("Rate limit exceeded. Please slow down.", 429);
    }

    // 2) Subscription-aware limiter for plan entitlements
    const subscriptionRateLimit =
      await subscriptionRateLimiter.checkSubscriptionRateLimit(
        request,
        "" as unknown as string, // cookie-only: no token
        userId,
        "search_performed"
      );
    if (!subscriptionRateLimit.allowed) {
      return errorResponse(
        subscriptionRateLimit.error || "Subscription limit exceeded",
        429
      );
    }

    const convexClient = getConvexClient();
    if (!convexClient)
      return errorResponse("Convex client not configured", 500);

    // Cookie-only: do not set bearer on Convex client

    // Parse and validate with Zod
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
    if (typeof ageMin === "number" && typeof ageMax === "number" && ageMin > ageMax) {
      return errorResponse("Minimum age cannot be greater than maximum age", 400);
    }

    const t0 = Date.now();
    console.info("search.api query", {
      scope: "search",
      correlationId: cid,
      userId,
      page,
      pageSize,
      filters: {
        hasCity: !!city,
        hasCountry: !!country,
        preferredGender: preferredGender ?? "any",
        ageMin,
        ageMax,
        hasEthnicity: !!ethnicity,
        hasMotherTongue: !!motherTongue,
        hasLanguage: !!language,
      },
    });

    const result = await convexClient.query(api.users.searchPublicProfiles, {
      city,
      country,
      ageMin,
      ageMax,
      preferredGender,
      page,
      pageSize,
      // extended filters
      ethnicity,
      motherTongue,
      language,
      // correlation
      correlationId: cid,
    });

    if (!result || typeof result !== "object") {
      console.error("Invalid search results from Convex:", result, {
        scope: "search",
        correlationId: cid,
      });
      return errorResponse("Search service error", 500);
    }

    const latencyMs = Date.now() - t0;
    console.info("search.api result", {
      scope: "search",
      correlationId: cid,
      userId,
      total: (result as any)?.total ?? 0,
      page,
      pageSize,
      latencyMs,
    });

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
