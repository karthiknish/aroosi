/**
 * Timestamp Utilities
 * Standardizes timestamp handling across the application.
 * All timestamps should be stored as milliseconds since Unix epoch (number).
 */

/**
 * Converts various timestamp formats to milliseconds since Unix epoch.
 * Handles: Date objects, ISO strings, seconds (auto-detected), milliseconds, undefined/null.
 * @returns number (milliseconds) or undefined if input is invalid/empty
 */
export function toTimestamp(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  // Already a number
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      return undefined;
    }
    // Heuristic: if value < 1e12, assume seconds; otherwise milliseconds
    // 1e12 ms ≈ year 2001, reasonable cutoff
    return value < 1e12 ? value * 1000 : value;
  }

  // Date object
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }

  // String - try parsing
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    // Pure numeric string
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      return num < 1e12 ? num * 1000 : num;
    }

    // ISO date string or other parseable format
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  // Firestore Timestamp-like object { seconds, nanoseconds }
  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as any).seconds === "number"
  ) {
    return (value as any).seconds * 1000;
  }

  return undefined;
}

/**
 * Converts milliseconds timestamp to Date object.
 */
export function fromTimestamp(ms: number): Date {
  return new Date(ms);
}

/**
 * Validates that a value is a valid timestamp (positive finite number).
 */
export function isValidTimestamp(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Returns current timestamp in milliseconds.
 * Prefer this over Date.now() for consistency.
 */
export function nowTimestamp(): number {
  return Date.now();
}

/**
 * Formats a timestamp for display (ISO string).
 */
export function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Calculates age of a timestamp in milliseconds.
 */
export function timestampAge(ms: number): number {
  return Date.now() - ms;
}

/**
 * Checks if a timestamp is within the last N milliseconds.
 */
export function isWithinLast(ms: number, windowMs: number): boolean {
  return timestampAge(ms) <= windowMs;
}
