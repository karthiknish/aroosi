// Shared image validation helpers
// Provides MIME allowlist, max size logic by subscription plan, basic filename sanitization,
// and lightweight signature sniffing to reject clearly invalid data early.

export type SubscriptionPlan = "free" | "premium" | "premiumPlus" | (string & {});

// Default per-plan max sizes (bytes). Can be overridden via env for operational flexibility.
const DEFAULT_SIZE_LIMITS: Record<string, number> = {
  free: 2 * 1024 * 1024, // 2MB
  premium: 5 * 1024 * 1024, // 5MB
  premiumPlus: 10 * 1024 * 1024, // 10MB
};

// Allowed MIME types. (HEIC/HEIF frequently produced by iOS devices.)
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

// Basic magic number / signature mapping for quick validation.
// (Not exhaustive, just enough to reject eg. plain text mislabeled uploads.)
interface SignatureSpec {
  mime: string;
  test: (bytes: Uint8Array) => boolean;
}

const SIGNATURE_SPECS: SignatureSpec[] = [
  { mime: "image/jpeg", test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9 },
  { mime: "image/png", test: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a },
  { mime: "image/gif", test: (b) => b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && (b[4] === 0x39 || b[4] === 0x37) && b[5] === 0x61 },
  { mime: "image/webp", test: (b) => b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 }, // RIFF....WEBP
  // HEIC/HEIF share ISO Base Media container; we only do a light sniff for 'ftypheic' / 'ftypheif' / 'ftypmif1'
  { mime: "image/heic", test: (b) => hasFtypBox(b, ["heic", "heix", "hevc", "hevx"]) },
  { mime: "image/heif", test: (b) => hasFtypBox(b, ["heif", "mif1"]) },
];

function hasFtypBox(b: Uint8Array, brands: string[]): boolean {
  if (b.length < 32) return false;
  // ISO BMFF: bytes 4-7 should be 'ftyp'
  if (!(b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70)) return false;
  // Major brand at bytes 8-11
  const major = String.fromCharCode(b[8], b[9], b[10], b[11]);
  return brands.includes(major);
}

export function getPlanMaxImageSize(plan: SubscriptionPlan | undefined | null): number {
  const key = (plan || "free").toString();
  const envOverride = process.env[`NEXT_PUBLIC_MAX_IMAGE_SIZE_${key.toUpperCase()}`];
  if (envOverride) {
    const parsed = parseInt(envOverride, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_SIZE_LIMITS[key] || DEFAULT_SIZE_LIMITS.free;
}

export interface ValidateImageUploadInput {
  fileSize: number; // as reported by File.size
  providedMime: string;
  plan?: SubscriptionPlan | null;
  // Optional bytes for signature sniffing. Provide a slice of the first N bytes for performance.
  headBytes?: Uint8Array;
}

export interface ValidateImageUploadResult {
  ok: boolean;
  errorCode?: string; // e.g. SIZE_EXCEEDED, MIME_DISALLOWED, EMPTY_FILE, SIGNATURE_MISMATCH
  message?: string;
  detectedMime?: string;
  limitBytes: number;
  plan: SubscriptionPlan | "unknown";
  allowedMimes: string[];
  width?: number;
  height?: number;
}

export function validateImageUpload(input: ValidateImageUploadInput): ValidateImageUploadResult {
  const { fileSize, providedMime, plan, headBytes } = input;
  const normalizedMime = (providedMime || "").toLowerCase();
  const limit = getPlanMaxImageSize(plan || "free");

  // Empty file check
  if (fileSize === 0) {
    return {
      ok: false,
      errorCode: "EMPTY_FILE",
      message: "Image file is empty",
      limitBytes: limit,
      plan: (plan || "unknown") as any,
      allowedMimes: ALLOWED_IMAGE_MIME_TYPES,
    };
  }

  if (fileSize > limit) {
    return {
      ok: false,
      errorCode: "SIZE_EXCEEDED",
      message: `Image exceeds maximum size of ${Math.round(limit / 1024 / 1024)}MB for your plan`,
      limitBytes: limit,
      plan: (plan || "unknown") as any,
      allowedMimes: ALLOWED_IMAGE_MIME_TYPES,
    };
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(normalizedMime)) {
    return {
      ok: false,
      errorCode: "MIME_DISALLOWED",
      message: "Unsupported image type",
      limitBytes: limit,
      plan: (plan || "unknown") as any,
      allowedMimes: ALLOWED_IMAGE_MIME_TYPES,
    };
  }

  // Optional signature sniff (best effort; skip if not provided)
  if (headBytes && headBytes.length >= 12) {
    const matched = SIGNATURE_SPECS.find((s) => s.test(headBytes));
    if (matched && matched.mime !== normalizedMime) {
      return {
        ok: false,
        errorCode: "SIGNATURE_MISMATCH",
        message: `File content does not match reported type (reported ${normalizedMime}, detected ${matched.mime})`,
        limitBytes: limit,
        plan: (plan || "unknown") as any,
        allowedMimes: ALLOWED_IMAGE_MIME_TYPES,
        detectedMime: matched.mime,
      };
    }
    // If none matched, we still allow (some formats or truncated head); could optionally fail closed
  }

  let dims: { width?: number; height?: number } = {};
  try {
    if (headBytes) {
      dims = tryExtractImageDimensions(headBytes, normalizedMime) || {};
    }
  } catch { /* swallow */ }

  return {
    ok: true,
    limitBytes: limit,
    plan: (plan || "unknown") as any,
    allowedMimes: ALLOWED_IMAGE_MIME_TYPES,
    width: dims.width,
    height: dims.height,
  };
}

// Basic filename sanitization: strip path separators & limit length.
export function sanitizeFileName(name: string): string {
  if (!name) return "image";
  // Remove any directory components & null bytes.
  let base = name.replace(/\\/g, "/").split("/").pop() || "image";
  base = base.replace(/\0/g, "");
  // Whitelist characters; replace others with '-'
  base = base.replace(/[^a-zA-Z0-9._-]/g, "-");
  if (base.length > 80) {
    const extIndex = base.lastIndexOf('.')
    if (extIndex > 0 && extIndex < 70) {
      const ext = base.slice(extIndex + 1);
      base = base.slice(0, 70) + "-" + Date.now() + (ext ? "." + ext : "");
    } else {
      base = base.slice(0, 80);
    }
  }
  return base;
}

// Lightweight helper to extract a head slice from full bytes (so callers can avoid copying).
export function sliceHead(bytes: Uint8Array, length = 128): Uint8Array {
  if (bytes.length <= length) return bytes;
  return bytes.subarray(0, length);
}

// TODO (future): integrate image dimension extraction & content safety scanning (NSFW, malware) before accepting the upload.

// --- Dimension Extraction (best-effort, limited to head bytes) ---
// NOTE: This is intentionally lightweight and NOT a full parser. It only inspects common headers.
function tryExtractImageDimensions(head: Uint8Array, mime: string): { width: number; height: number } | undefined {
  try {
    if (mime === "image/png" && head.length >= 24) {
      // PNG: width & height big-endian at bytes 16-23 (after 8-byte signature + 8-byte length+IHDR)
      const dv = new DataView(head.buffer, head.byteOffset, head.byteLength);
      const width = dv.getUint32(16);
      const height = dv.getUint32(20);
      if (width > 0 && height > 0) return { width, height };
    } else if (mime === "image/gif" && head.length >= 10) {
      // GIF: width & height little-endian at bytes 6-9
      const dv = new DataView(head.buffer, head.byteOffset, head.byteLength);
      const width = dv.getUint16(6, true);
      const height = dv.getUint16(8, true);
      if (width > 0 && height > 0) return { width, height };
    } else if (mime === "image/jpeg") {
      // Minimal JPEG SOFx scan within head bytes.
      let i = 2; // skip 0xFFD8
      while (i + 9 < head.length) {
        if (head[i] !== 0xFF) { i++; continue; }
        const marker = head[i + 1];
        // SOF0 (0xC0), SOF2 (0xC2)
        if (marker === 0xC0 || marker === 0xC2) {
          if (i + 8 >= head.length) break;
          const dv = new DataView(head.buffer, head.byteOffset + i + 5, 4); // precision at i+4, then height, width
          const height = dv.getUint16(0);
          const width = dv.getUint16(2);
            if (width > 0 && height > 0) return { width, height };
          break;
        }
        // segment length at i+2 (big-endian) includes length bytes
        const len = (head[i + 2] << 8) + head[i + 3];
        if (len < 2) break;
        i += 2 + len;
      }
    }
  } catch { /* ignore */ }
  return undefined;
}
