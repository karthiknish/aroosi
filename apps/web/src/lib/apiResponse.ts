/**
 * @deprecated Use imports from '@/lib/api/handler' instead.
 * This file is maintained for backward compatibility only.
 * 
 * Migration:
 *   // Old:
 *   import { successResponse, errorResponse } from '@/lib/apiResponse';
 *   // New:
 *   import { successResponse, errorResponse } from '@/lib/api/handler';
 */

export type ApiSuccess<T> = { success: true; data?: T };
export type ApiFailure = { success: false; error: string } & Record<
  string,
  unknown
>;
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

import { SECURITY_HEADERS } from "@/lib/utils/securityHeaders";

function generateCorrelationId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

/**
 * @deprecated Use successResponse from '@/lib/api/handler' instead
 */
export const successResponse = <T = unknown>(data?: T, status = 200) =>
  (() => {
    const correlationId = generateCorrelationId();
    return new Response(
      JSON.stringify({
        success: true,
        correlationId,
        ...(data !== undefined ? { data } : {}),
      } satisfies ApiSuccess<T> & { correlationId: string }),
      {
        status,
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": correlationId,
          ...SECURITY_HEADERS,
        },
      }
    );
  })();

/**
 * @deprecated Use errorResponse from '@/lib/api/handler' instead
 */
export const errorResponse = (
  error: unknown,
  status = 400,
  extra?: Record<string, unknown>
) => {
  const correlationId = generateCorrelationId();

  const isDev = process.env.NODE_ENV === "development";
  // Only expose detailed error messages in development to avoid leaking internal details.
  const message = isDev
    ? typeof error === "string"
      ? error
      : error instanceof Error && error.message
        ? error.message
        : "Unknown error"
    : "Something went wrong";

  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      correlationId,
      ...(extra ?? {}),
    } satisfies ApiFailure),
    {
      status,
      headers: { "Content-Type": "application/json", "x-correlation-id": correlationId, ...SECURITY_HEADERS },
    }
  );
};

/**
 * @deprecated Use errorResponsePublic from '@/lib/api/handler' instead
 */
export const errorResponsePublic = (
  message: string,
  status = 400,
  extra?: Record<string, unknown>
) =>
  (() => {
    const correlationId = generateCorrelationId();

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        correlationId,
        ...(extra ?? {}),
      }),
      {
        status,
        headers: { "Content-Type": "application/json", "x-correlation-id": correlationId, ...SECURITY_HEADERS },
      }
    );
  })();
