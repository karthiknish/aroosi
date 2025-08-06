/**
 * Centralized cookie attribute helpers for auth cookies.
 * Supports single-origin, subdomain sharing, and cross-site scenarios via env.
 *
 * Env variables:
 * - COOKIE_DOMAIN: e.g., ".example.com" to share across subdomains. Empty/undefined => host-only.
 * - COOKIE_SAMESITE: "Lax" | "None" (default "Lax").
 * - COOKIE_SECURE: "1" | "0" (default NODE_ENV === "production" ? "1" : "0").
 *
 * TTL constants (enforced across all routes):
 * - ACCESS_TTL_SEC = 900 (15 minutes)
 * - REFRESH_TTL_SEC = 604800 (7 days)
 * - PUBLIC_TTL_SEC = 60 (1 minute)
 *
 * Notes:
 * - When SameSite=None, Secure must be set; this helper enforces it.
 * - Use getAuthCookieAttrs for HttpOnly auth cookies.
 * - Use getPublicCookieAttrs for non-HttpOnly short-lived public cookie.
 * - Use getExpireCookieAttrs for immediate-expiry headers (Max-Age=0).
 */
export const ACCESS_TTL_SEC = 60 * 15; // 900
export const REFRESH_TTL_SEC = 60 * 60 * 24 * 7; // 604800
export const PUBLIC_TTL_SEC = 60;
const getBaseFlags = () => {
  const DOMAIN = process.env.COOKIE_DOMAIN?.trim();
  const SAMESITE_RAW = process.env.COOKIE_SAMESITE;
  const SAMESITE = (SAMESITE_RAW && SAMESITE_RAW.trim()) || "Lax";
  const SECURE_ENV =
    process.env.COOKIE_SECURE ??
    (process.env.NODE_ENV === "production" ? "1" : "0");

  // Proactive environment diagnostics (server logs only)
  try {
    const scope = "auth.cookies";
    const warnings: string[] = [];

    // Validate SameSite
    const sLower = SAMESITE.toLowerCase();
    if (!["lax", "none", "strict"].includes(sLower)) {
      warnings.push(
        `Invalid COOKIE_SAMESITE value "${SAMESITE}". Using default "Lax".`
      );
    }

    // If SameSite=None, Secure must be on (browser requirement)
    const secureRequiredDiag = sLower === "none" ? "1" : SECURE_ENV;

    // Domain sanity checks
    if (DOMAIN) {
      // Require leading dot for cross-subdomain scope
      if (!DOMAIN.startsWith(".")) {
        warnings.push(
          `COOKIE_DOMAIN "${DOMAIN}" does not start with ".". For subdomain sharing use a leading dot, e.g. ".aroosi.app".`
        );
      }
      // Obvious mismatch hint (heuristic, safe log)
      const host =
        process.env.NEXT_PUBLIC_APP_HOST || process.env.VERCEL_URL || "";
      if (host && !host.endsWith(DOMAIN.replace(/^\./, ""))) {
        warnings.push(
          `COOKIE_DOMAIN "${DOMAIN}" may not match current host "${host}". This can prevent cookies from being set.`
        );
      }
    }

    // Localhost + Secure diagnostic
    if (
      process.env.NODE_ENV !== "production" &&
      secureRequiredDiag === "1" &&
      process.env.VERCEL !== "1"
    ) {
      warnings.push(
        "COOKIE_SECURE is enabled while not on HTTPS (likely localhost). Secure cookies will not be sent by the browser."
      );
    }

    // Emit aggregated warning once
    if (warnings.length > 0) {
      console.warn("Cookie configuration diagnostics", {
        scope,
        type: "env_warning",
        samesite: SAMESITE,
        secure: SECURE_ENV,
        secureEffective: secureRequiredDiag,
        domain: DOMAIN || "(host-only)",
        warnings,
      });
    }
  } catch {
    // best-effort; never throw from diagnostics
  }

  // Compute final flags
  const sLowerFinal = SAMESITE.toLowerCase();
  const secureRequired = sLowerFinal === "none" ? "1" : SECURE_ENV;

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

export function getExpireCookieAttrs(): string {
  const parts = getBaseFlags();
  parts.push("Max-Age=0");
  return parts.join("; ");
}

/**
 * Append clear cookies for auth in a response:
 * - Clears auth-token, refresh-token (HttpOnly) and authTokenPublic (public) using Max-Age=0
 */
export function appendClearAuthCookies(res: Response): void {
  const expired = getExpireCookieAttrs();
  res.headers.append("Set-Cookie", `auth-token=; HttpOnly; ${expired}`);
  res.headers.append("Set-Cookie", `refresh-token=; HttpOnly; ${expired}`);
  res.headers.append("Set-Cookie", `authTokenPublic=; ${expired}`);
}