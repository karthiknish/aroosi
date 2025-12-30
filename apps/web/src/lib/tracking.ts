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

type TrackingTokenPayload = {
  url: string;
  cid?: string;
  eid?: string;
  ts: number;
};

function base64UrlEncode(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function getTrackingSecret(): string {
  return (
    process.env.TRACKING_LINK_SECRET ||
    process.env.TRACKING_SALT ||
    process.env.FIREBASE_PROJECT_ID ||
    "aroosi_default_tracking_secret"
  );
}

export function createSignedTrackingToken(payload: Omit<TrackingTokenPayload, "ts"> & { ts?: number }): string {
  const ts = payload.ts ?? Date.now();
  const full: TrackingTokenPayload = { ...payload, ts };
  const json = JSON.stringify(full);
  const body = base64UrlEncode(json);
  const sig = crypto
    .createHmac("sha256", getTrackingSecret())
    .update(body)
    .digest();
  return `${body}.${base64UrlEncode(sig)}`;
}

export function verifySignedTrackingToken(
  token: string,
  opts?: { maxAgeMs?: number }
): TrackingTokenPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto
    .createHmac("sha256", getTrackingSecret())
    .update(body)
    .digest();
  const provided = base64UrlDecode(sig);

  // Constant-time compare (length must match)
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;

  try {
    const decoded = JSON.parse(base64UrlDecode(body).toString("utf8")) as TrackingTokenPayload;
    if (!decoded || typeof decoded.url !== "string" || typeof decoded.ts !== "number") return null;
    if (opts?.maxAgeMs && Date.now() - decoded.ts > opts.maxAgeMs) return null;
    return decoded;
  } catch {
    return null;
  }
}
