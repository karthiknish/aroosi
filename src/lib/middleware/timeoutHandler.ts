import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiResponse";

export function createTimeoutHandler(timeoutMs: number) {
  return async function timeoutHandler(
    request: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse | Response> {
    const timeoutPromise = new Promise<NextResponse>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([handler(), timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message.includes("timeout")) {
        return errorResponse("Request timeout - please try again later", 504, {
          details: error.message,
          timeoutMs,
        });
      }
      throw error;
    }
  };
}

export const defaultTimeoutHandler = createTimeoutHandler(30000); // 30 seconds
