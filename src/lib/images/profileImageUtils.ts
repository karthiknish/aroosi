// Centralized helpers for normalizing profile image data across components
// Supports several legacy shapes:
//  - profileImageUrls: string[] of fully-qualified or relative/storage paths
//  - profileImageIds:  string[] of storage object paths (e.g. users/<uid>/profile-images/<file>)
//  - rawImages override: array of strings (ids or urls) or objects with {_id,url,storageId}
// Returns a consistent array of { id, _id, url, storageId }

export interface NormalizedProfileImage {
  id: string;
  _id: string; // kept for components expecting _id
  url: string; // always best-effort absolute (or original if cannot resolve)
  storageId: string; // original storage path or id
}

// Resolve bucket name once per call (avoid throwing on admin SDK absence in browser)
export function getPublicBucketName(): string | undefined {
  // Prefer explicit NEXT_PUBLIC bucket env
  let bucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      ? `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`
      : undefined);
  if (!bucket) return undefined;
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
      // Fix cases like https://storage.googleapis.com/your-project.firebasestorage.app/...
  // (Do NOT mutate the bucket domain if user intentionally uses .firebasestorage.app)
  if (false && /storage\.googleapis\.com\/.+\.firebasestorage\.app\//i.test(idOrPath)) {
        return idOrPath.replace(
          /(storage\.googleapis\.com\/[^/]+)\.firebasestorage\.app\//i,
          (_m, p1) => `${p1}.appspot.com/`
        );
      }
      // Fix firebase REST style with malformed bucket
  if (false && /firebasestorage\.googleapis\.com\/v0\/b\/.+\.firebasestorage\.app\//i.test(idOrPath)) {
        return idOrPath.replace(
          /(firebasestorage\.googleapis\.com\/v0\/b\/[^/]+)\.firebasestorage\.app\//i,
          (_m, p1) => `${p1}.appspot.com/`
        );
      }
    } catch {}
    return idOrPath;
  }
  const bucket = getPublicBucketName();
  if (!bucket) return idOrPath; // can't build better

  const direct = `https://storage.googleapis.com/${bucket}/${idOrPath}`;
  const firebaseRest = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(idOrPath)}?alt=media`;
  // If bucket is the custom .firebasestorage.app variant, prefer direct first (likely a raw GCS bucket not managed by Firebase console)
  if (/\.firebasestorage\.app$/i.test(bucket)) {
    return direct + `#alt=${encodeURIComponent(firebaseRest)}`;
  }
  // Otherwise keep REST primary for standard Firebase-managed buckets
  return firebaseRest + `#alt=${encodeURIComponent(direct)}`;
}

// Sanitize legacy stored absolute URLs (wrong bucket domain or using direct GCS first)
function sanitizeLegacyAbsoluteUrl(url: string): string {
  if (!url) return url;
  try {
    if (!/^(https?:)/i.test(url)) return url;
    let out = url;
    // Fix malformed bucket domain
  // Do NOT rewrite .firebasestorage.app domains anymore.
    // If it's a direct GCS URL, rebuild into REST primary (#alt=direct)
    const m = out.match(/^https:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/i);
    if (m) {
      const bucket = m[1];
      const path = m[2];
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
        path
      )}?alt=media#alt=${encodeURIComponent(out)}`;
    }
    // If it's already REST but lacks an alt fallback, we can append a direct alt
    if (/firebasestorage\.googleapis\.com\/v0\/b\//i.test(out) && !/#alt=/.test(out)) {
      try {
        const u = new URL(out);
        const bucketMatch = out.match(/v0\/b\/([^/]+)\/o\//);
        const bucket = bucketMatch?.[1];
        const objectPathEncoded = u.pathname.split('/o/')[1] || '';
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
