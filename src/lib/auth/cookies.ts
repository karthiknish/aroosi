/**
 * Centralized cookie attribute helpers for auth cookies.
 * Supports single-origin, subdomain sharing, and cross-site scenarios via env.
 *
 * Env variables:
 * - COOKIE_DOMAIN: e.g., ".example.com" to share across subdomains. Empty/undefined => host-only.
 * - COOKIE_SAMESITE: "Lax" | "None" (default "Lax").
 * - COOKIE_SECURE: "1" | "0" (default NODE_ENV === "production" ? "1" : "0").
 *
 * Notes:
 * - When SameSite=None, Secure must be set; this helper enforces it.
 * - Use getAuthCookieAttrs for HttpOnly auth cookies.
 * - Use getPublicCookieAttrs for non-HttpOnly short-lived public cookie.
 */
const getBaseFlags = () => {
  const DOMAIN = process.env.COOKIE_DOMAIN?.trim();
  const SAMESITE = (process.env.COOKIE_SAMESITE || "Lax").trim();
  const SECURE_ENV =
    process.env.COOKIE_SECURE ?? (process.env.NODE_ENV === "production" ? "1" : "0");

  // Enforce Secure when SameSite=None (browser requirement)
  const secureRequired = SAMESITE.toLowerCase() === "none" ? "1" : SECURE_ENV;

  const parts: string[] = ["Path=/", `SameSite=${SAMESITE}`];
  if (DOMAIN) parts.push(`Domain=${DOMAIN}`);
  if (secureRequired === "1") parts.push("Secure");
  return parts;
};

export function getAuthCookieAttrs(maxAgeSec: number): string {
  const parts = getBaseFlags();
  parts.push("HttpOnly", `Max-Age=${Math.max(0, Math.floor(maxAgeSec))}`);
  return parts.join("; ");
}

export function getPublicCookieAttrs(maxAgeSec: number): string {
  const parts = getBaseFlags();
  parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSec))}`);
  return parts.join("; ");
}