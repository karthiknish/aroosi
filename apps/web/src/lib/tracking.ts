import crypto from "crypto";

// Generate a stable, non-reversible hash for an email using a secret salt.
// Avoid storing raw emails in tracking documents.
export function hashEmail(email: string): string {
  const salt = process.env.TRACKING_SALT || process.env.FIREBASE_PROJECT_ID || "aroosi_default_salt";
  return crypto.createHash("sha256").update(`${salt}::${email.toLowerCase().trim()}`).digest("hex");
}

// Returns the iso string truncated to the hour (UTC) for bucketing metrics
export function hourKey(ts: number): string {
  const floor = Math.floor(ts / 3600000) * 3600000;
  return new Date(floor).toISOString();
}

export function getPublicBaseUrl(): string {
  // Prefer explicit public URL envs; fallback to Vercel url; else localhost
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  return (vercel || "http://localhost:3000").replace(/\/$/, "");
}
