import { NextRequest } from "next/server";
import { z } from "zod";

// Validation schemas for subscription endpoints
export const featureSchema = z.enum([
  "message_sent",
  "profile_view",
  "search_performed",
  "interest_sent",
  "profile_boost_used",
  "voice_message_sent",
]);

export const platformSchema = z.enum(["ios", "android", "web"]);

export const purchaseValidationSchema = z.object({
  platform: platformSchema,
  productId: z.string().min(1),
  purchaseToken: z.string().optional(),
  receiptData: z.string().optional(),
});

export const trackUsageSchema = z.object({
  feature: featureSchema,
  metadata: z.record(z.any()).optional(),
});

export const validateRequest = async <T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T } | { error: string }> => {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
      };
    }
    return { error: "Invalid request body" };
  }
};

export const validateQueryParams = <T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { data: T } | { error: string } => {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const data = schema.parse(params);
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
      };
    }
    return { error: "Invalid query parameters" };
  }
};
