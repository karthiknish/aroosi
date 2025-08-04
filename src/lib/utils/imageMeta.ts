/**
 * Lightweight image metadata loader and validators for client-side guards.
 *
 * Usage:
 *   const meta = await loadImageMeta(file);
 *   const { ok, reason } = validateImageMeta(meta, { minDim: 512, minAspect: 0.5, maxAspect: 2.0 });
 *   if (!ok) { // show reason }
 */

/**
 * Reads width/height of an image File without uploading.
 * Ensures URL.revokeObjectURL is called after load/error.
 */
export async function loadImageMeta(file: File): Promise<{ width: number; height: number }> {
  if (!(file instanceof File)) {
    throw new Error("loadImageMeta: expected a File");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
      img.onerror = () => reject(new Error("Failed to decode image for metadata"));
      img.src = objectUrl;
    });
    return { width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export interface ImageGuardOptions {
  minDim?: number;     // minimum width and height
  minAspect?: number;  // min width/height ratio
  maxAspect?: number;  // max width/height ratio
}

/**
 * Validates image dimensions and aspect ratio.
 * Defaults are conservative and can be overridden per-call.
 */
export function validateImageMeta(
  meta: { width: number; height: number },
  opts: ImageGuardOptions = {}
): { ok: boolean; reason?: string } {
  const minDim = typeof opts.minDim === "number" ? opts.minDim : 512;
  const minAspect = typeof opts.minAspect === "number" ? opts.minAspect : 0.5;
  const maxAspect = typeof opts.maxAspect === "number" ? opts.maxAspect : 2.0;

  const { width, height } = meta;
  if (!width || !height) {
    return { ok: false, reason: "Invalid image dimensions" };
  }

  const smallest = Math.min(width, height);
  if (smallest < minDim) {
    return { ok: false, reason: `Image too small. Minimum dimension is ${minDim}px` };
  }

  const aspect = width / height;
  if (aspect < minAspect || aspect > maxAspect) {
    return {
      ok: false,
      reason: `Unsupported aspect ratio (${aspect.toFixed(2)}). Allowed range ${minAspect}–${maxAspect}`,
    };
  }

  return { ok: true };
}