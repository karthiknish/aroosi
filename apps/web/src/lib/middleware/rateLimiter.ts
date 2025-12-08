import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiResponse";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0] || realIp || "unknown";
}

function getRateLimitKey(request: NextRequest): string {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";
  return `${ip}:${userAgent}`;
}

function cleanupStore() {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime <= now) {
      delete store[key];
    }
  });
}

export function createRateLimiter(config: RateLimitConfig) {
  return async function rateLimiter(
    request: NextRequest
  ): Promise<NextResponse | Response | null> {
    cleanupStore();

    const key = getRateLimitKey(request);
    const now = Date.now();

    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      return null;
    }

    if (store[key].resetTime <= now) {
      store[key] = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      return null;
    }

    store[key].count++;

    if (store[key].count > config.maxRequests) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      return errorResponse("Too many requests, please try again later", 429, {
        retryAfter,
        limit: config.maxRequests,
        windowMs: config.windowMs,
      });
    }

    return null;
  };
}

// Pre-configured rate limiters
export const subscriptionRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
});

export const purchaseRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20,
});

export const usageRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 50,
});
