import type { ProfileImageInfo } from "@aroosi/shared/types";

export interface NormalizedProfileImage extends ProfileImageInfo {
  id: string;
  _id: string; // kept for components expecting _id
  url: string; // always best-effort absolute (or original if cannot resolve)
  storageId: string; // original storage path or id
}

// Resolve bucket name once per call (avoid throwing on admin SDK absence in browser)
export function getPublicBucketName(): string | undefined {
  // Prefer explicit NEXT_PUBLIC bucket env
  const bucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      ? `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`
      : undefined);
  if (!bucket) return undefined; // explicit undefined maintains return type
  // NOTE: We intentionally no longer rewrite buckets ending in .firebasestorage.app
  // because the project explicitly wants to keep using that custom bucket name.
  // (Previously we normalized to .appspot.com.)
  return bucket;
}

// Build a public GCS URL if possible; if already absolute (http/https/blob/data) returns as-is
export function buildProfileImageUrl(idOrPath: string): string {
  if (!idOrPath) return idOrPath;
  // If it's already an absolute URL, still attempt to sanitize malformed bucket patterns
  if (/^(https?:|blob:|data:)/i.test(idOrPath)) {
    try {
      // Prefer proxy for Firebase/GCS absolute URLs to get signed access
      try {
        const u = new URL(idOrPath);
        // Direct GCS: https://storage.googleapis.com/<bucket>/<path>
        if (/^storage\.googleapis\.com$/i.test(u.hostname)) {
          const parts = u.pathname.split("/").filter(Boolean);
          if (parts.length >= 2) {
            const storagePath = decodeURIComponent(parts.slice(1).join("/"));
            if (
              storagePath.startsWith("users/") ||
              storagePath.startsWith("profileImages/")
            )
              return `/api/storage/${storagePath}`;
          }
        }
        // Firebase REST: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?alt=media
        if (/^firebasestorage\.googleapis\.com$/i.test(u.hostname)) {
          const m = u.pathname.match(/\/v0\/b\/[^/]+\/o\/(.+)$/);
          if (m?.[1]) {
            const storagePath = decodeURIComponent(m[1]);
            if (
              storagePath.startsWith("users/") ||
              storagePath.startsWith("profileImages/")
            )
              return `/api/storage/${storagePath}`;
          }
        }
      } catch {}
    } catch {}
    return idOrPath;
  }
  const bucket = getPublicBucketName();
  if (!bucket) return idOrPath; // can't build better

  // Prefer proxy for storage paths we control
  if (idOrPath.startsWith("users/") || idOrPath.startsWith("profileImages/")) {
    return `/api/storage/${idOrPath}`;
  }

  const direct = `https://storage.googleapis.com/${bucket}/${idOrPath}`;
  const firebaseRest = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(idOrPath)}?alt=media`;
  // Include both as hints via #alt fallback
  return firebaseRest + `#alt=${encodeURIComponent(direct)}`;
}

// Sanitize legacy stored absolute URLs (wrong bucket domain or using direct GCS first)
function sanitizeLegacyAbsoluteUrl(url: string): string {
  if (!url) return url;
  try {
    if (!/^(https?:)/i.test(url)) return url;
    const out = url;

    // If the URL already contains a signed query string, proxy it so we never
    // depend on long-lived signed URLs stored in Firestore.
    if (/(\bGoogleAccessId=|\bSignature=|\bExpires=|\bX-Goog-Signature=)/i.test(out)) {
      try {
        const u = new URL(out);
        if (/^storage\.googleapis\.com$/i.test(u.hostname)) {
          const parts = u.pathname.split("/").filter(Boolean);
          if (parts.length >= 2) {
            const storagePath = decodeURIComponent(parts.slice(1).join("/"));
            if (
              storagePath.startsWith("users/") ||
              storagePath.startsWith("profileImages/")
            ) {
              return `/api/storage/${storagePath}`;
            }
          }
        }
        if (/^firebasestorage\.googleapis\.com$/i.test(u.hostname)) {
          const m = u.pathname.match(/\/v0\/b\/[^/]+\/o\/(.+)$/);
          if (m?.[1]) {
            const storagePath = decodeURIComponent(m[1]);
            if (
              storagePath.startsWith("users/") ||
              storagePath.startsWith("profileImages/")
            ) {
              return `/api/storage/${storagePath}`;
            }
          }
        }
      } catch {}
    }

    // Fix malformed bucket domain
    // Do NOT rewrite .firebasestorage.app domains anymore.
    // If it's a direct GCS URL, rebuild into REST primary (#alt=direct)
    const m = out.match(/^https:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/i);
    if (m) {
      const bucket = m[1];
      const path = m[2];
      // Prefer proxy when the object is in known profile folders
      try {
        const storagePath = decodeURIComponent(path);
        if (
          storagePath.startsWith("users/") ||
          storagePath.startsWith("profileImages/")
        ) {
          return `/api/storage/${storagePath}`;
        }
      } catch {}
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
        path
      )}?alt=media#alt=${encodeURIComponent(out)}`;
    }
    // If it's already REST but lacks an alt fallback, we can append a direct alt
    if (
      /firebasestorage\.googleapis\.com\/v0\/b\//i.test(out) &&
      !/#alt=/.test(out)
    ) {
      try {
        const u = new URL(out);
        const bucketMatch = out.match(/v0\/b\/([^/]+)\/o\//);
        const bucket = bucketMatch?.[1];
        const objectPathEncoded = u.pathname.split("/o/")[1] || "";
        const objectPath = decodeURIComponent(objectPathEncoded);
        if (bucket && objectPath) {
          const direct = `https://storage.googleapis.com/${bucket}/${objectPath}`;
          return out + `#alt=${encodeURIComponent(direct)}`;
        }
      } catch {}
    }
    return out;
  } catch {
    return url;
  }
}

export function normalizeProfileImages(opts: {
  profileImageUrls?: unknown;
  profileImageIds?: unknown;
  rawImages?: Array<string | { _id: string; url?: string; storageId?: string }> | null;
}): NormalizedProfileImage[] {
  const { profileImageUrls, profileImageIds, rawImages } = opts;

  // 1) If explicit rawImages provided (e.g. from an upload / reorder component), map those
  if (Array.isArray(rawImages) && rawImages.length) {
    return rawImages.map((img, index) => {
      if (typeof img === 'string') {
        const url = buildProfileImageUrl(img);
        return { id: img, _id: img, url, storageId: img };
      }
      let storageId = img.storageId || img._id || `img-${index}`;
      const base = img.url || storageId;
      const url = /^(https?:)/i.test(String(base))
        ? sanitizeLegacyAbsoluteUrl(String(base))
        : buildProfileImageUrl(String(base));
      // If storageId looks like placeholder (img-#) but base is absolute, attempt to derive the true object path
      if (/^img-\d+$/i.test(storageId) && /^(https?:)/i.test(String(base))) {
        try {
          const u = new URL(String(base));
          if (u.hostname.includes('firebasestorage.googleapis.com')) {
            const match = u.pathname.match(/\/v0\/b\/[^/]+\/o\/(.+)$/);
            if (match?.[1]) storageId = decodeURIComponent(match[1]);
          } else if (u.hostname.includes('storage.googleapis.com')) {
            const parts = u.pathname.split('/');
            if (parts.length >= 3) storageId = decodeURIComponent(parts.slice(2).join('/'));
          }
        } catch {}
      }
      return { id: storageId, _id: storageId, url, storageId };
    });
  }

  const ids: string[] = Array.isArray(profileImageIds)
    ? (profileImageIds as unknown[]).filter((v): v is string => typeof v === 'string')
    : [];
  const urls: string[] = Array.isArray(profileImageUrls)
    ? (profileImageUrls as unknown[]).filter((v): v is string => typeof v === 'string')
    : [];

  // 2) If urls array has content, pair with ids when possible
  if (urls.length) {
    return urls.map((u, i) => {
      const id = ids[i] || urls[i] || `url-${i}`;
      return {
        id,
        _id: id,
  url: /^(https?:)/i.test(u) ? sanitizeLegacyAbsoluteUrl(u) : buildProfileImageUrl(u),
        storageId: ids[i] || id,
      };
    });
  }

  // 3) Fallback: build from ids only
  if (ids.length) {
    return ids.map((id) => ({
      id,
      _id: id,
      url: buildProfileImageUrl(id),
      storageId: id,
    }));
  }

  return [];
}
