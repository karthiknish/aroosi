/**
 * Array Normalization Utilities
 * Ensures consistent array handling for partner preferences and similar fields.
 */

/**
 * Converts a string, array, or undefined value to a string array.
 * - If already an array: filters to strings only, trims whitespace, removes empties
 * - If a string: splits by comma, trims, removes empties
 * - If undefined/null: returns empty array
 */
export function toStringArray(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : String(v).trim()))
      .filter((v) => v.length > 0);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    // Split by comma, semicolon, or newline
    return trimmed
      .split(/[,;\n]+/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }

  // Single non-string value - convert to string
  const str = String(value).trim();
  return str ? [str] : [];
}

/**
 * Partner preference field names that should always be arrays.
 */
const ARRAY_PREFERENCE_FIELDS = [
  "preferredCities",
  "preferredReligions",
  "preferredEthnicities",
  "preferredLanguages",
  "preferredEducation",
  "preferredOccupations",
  "preferredMaritalStatuses",
] as const;

type ArrayPreferenceField = (typeof ARRAY_PREFERENCE_FIELDS)[number];

/**
 * Normalizes all partner preference fields in a data object to arrays.
 * Mutates the input object and returns it for convenience.
 */
export function normalizePartnerPreferences<
  T extends Partial<Record<ArrayPreferenceField, unknown>>
>(data: T): T {
  for (const field of ARRAY_PREFERENCE_FIELDS) {
    if (field in data) {
      (data as any)[field] = toStringArray(data[field]);
    }
  }
  return data;
}

/**
 * Checks if a value is a non-empty array.
 */
export function isNonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Ensures a value is an array (wraps single values).
 */
export function ensureArray<T>(value: T | T[]): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

/**
 * Limits array to a maximum length.
 */
export function limitArray<T>(arr: T[], max: number): T[] {
  return arr.slice(0, max);
}
