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
    const secureRequired = sLower === "none" ? "1" : SECURE_ENV;

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
      secureRequired === "1" &&
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
        secureEffective: sLower === "none" ? "1" : SECURE_ENV,
        domain: DOMAIN || "(host-only)",
        warnings,
      });
    }
  } catch {
    // best-effort; never throw from diagnostics
  }

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