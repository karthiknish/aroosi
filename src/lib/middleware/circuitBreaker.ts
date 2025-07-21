import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiResponse";

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  successThreshold: number;
}

class CircuitBreaker {
  private failures = 0;
  private successes = 0;
  private state: "closed" | "open" | "half-open" = "closed";
  private lastFailureTime = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => T
  ): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = "half-open";
        this.successes = 0;
      } else {
        if (fallback) {
          return fallback();
        }
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await operation();

      if (this.state === "half-open") {
        this.successes++;
        if (this.successes >= this.config.successThreshold) {
          this.state = "closed";
          this.failures = 0;
        }
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.config.failureThreshold) {
        this.state = "open";
      }

      if (fallback) {
        return fallback();
      }

      throw error;
    }
  }

  getState(): string {
    return this.state;
  }
}

export const appleCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minute
  successThreshold: 2,
});

export const googleCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minute
  successThreshold: 2,
});

export const stripeCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  successThreshold: 3,
});
