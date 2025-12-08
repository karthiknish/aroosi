/** Common lightweight validation helpers reused across API routes */

export function isValidEmailAddress(email: unknown): email is string {
  if (typeof email !== "string") return false;
  if (email.length === 0 || email.length > 255) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validates a potentially relative or absolute URL ensuring it resolves within the allowed origin.
 * - baseUrl must be a fully-qualified origin
 * - Only http(s) protocols accepted
 * - Enforces same-origin to prevent open redirects
 */
export function validateSameOriginUrl(input: unknown, baseUrl: string): string | null {
  if (typeof input !== "string" || !input) return null;
  try {
    const candidate = new URL(input, baseUrl);
    const base = new URL(baseUrl);
    if (candidate.origin !== base.origin) return null;
    if (!/^https?:$/.test(candidate.protocol)) return null;
    return candidate.toString();
  } catch {
    return null;
  }
}

export function safeTrimString(value: unknown, max = 512): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}
