// Blog sanitization helpers.
// We now integrate DOMPurify server-side (with JSDOM) for strong XSS protection of rich HTML content.
// Falls back to a light heuristic sanitizer if DOMPurify initialization fails for any reason.

let domPurifyInstance: any | null = null;

// Initialize once at module load (server-side only). Using top-level await keeps API synchronous for callers.
if (typeof window === "undefined") {
  try {
    const [{ default: createDOMPurify }, { JSDOM }] = await Promise.all([
      import("dompurify"),
      import("jsdom"),
    ]);
    const { window: jsdomWindow } = new JSDOM("<div></div>");
  // JSDOM's window isn't the full browser global; cast loosely for DOMPurify which accepts a WindowLike
  domPurifyInstance = createDOMPurify(jsdomWindow as unknown as any);
    domPurifyInstance.setConfig({ USE_PROFILES: { html: true } });
  } catch {
    domPurifyInstance = null; // Fallback heuristic will apply
  }
}

function getDOMPurify() {
  return domPurifyInstance;
}

const SLUG_MAX = 120;
const TITLE_MAX = 300;
const EXCERPT_MAX = 2000;

function trimLength(str: string, max: number) {
  if (str.length <= max) return str;
  return str.slice(0, max);
}

export function sanitizeBlogTitle(title: string) {
  return trimLength(String(title || "").replace(/\s+/g, " ").trim(), TITLE_MAX);
}

export function sanitizeBlogSlug(slug: string) {
  return trimLength(
    String(slug || "")
      .toLowerCase()
      .replace(/[^a-z0-9\-\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, ""),
    SLUG_MAX
  );
}

export function sanitizeBlogExcerpt(excerpt: string) {
  return trimLength(String(excerpt || "").replace(/<[^>]*>/g, "").trim(), EXCERPT_MAX);
}

export function sanitizeBlogContent(html: string) {
  const dirty = String(html || "");
  if (!dirty.trim()) return "";
  const purifier = getDOMPurify();
  let cleaned: string;
  if (purifier) {
    try {
      cleaned = purifier.sanitize(dirty, {
        // Allow common formatting but disallow style & iframe by default; we post-filter selective iframes.
        FORBID_TAGS: ["style", "script"],
        // Keep data attributes off to reduce attack surface
        ALLOW_DATA_ATTR: false,
      });
    } catch {
      cleaned = dirty; // fallback to heuristic path below
    }
  } else {
    cleaned = dirty;
  }
  // Post-filter: remove iframes except trusted video providers (YouTube/Vimeo)
  cleaned = cleaned.replace(
    /<iframe[^>]*src=("|')(?!https?:\/\/(www\.)?(youtube\.com|youtu\.be|player\.vimeo\.com)\/)[^>]*>[\s\S]*?<\/iframe>/gi,
    ""
  );
  // Remove <img> tags with relative or invalid src (e.g., "/eieie", "djjdjdjdjd") to prevent 404 noise
  cleaned = cleaned.replace(
    /<img[^>]*src=["'](?!https?:\/\/|data:image\/)[^"']*["'][^>]*>/gi,
    ""
  );
  // Neutralize anchor tags with relative/non-http hrefs to avoid broken navigations
  cleaned = cleaned.replace(
    /<a\s+([^>]*?)href=["'](?!https?:\/\/|mailto:|#)[^"']*["']([^>]*)>/gi,
    "<a $1$2>"
  );
  // Remove inline event handlers & javascript: schemes as an extra defensive layer.
  cleaned = cleaned.replace(/ on[a-z]+\s*=\s*("|')(?:[^"']*)("')/gi, "");
  cleaned = cleaned.replace(/javascript:/gi, "");
  // Trim extremely large base64 payloads
  cleaned = cleaned.replace(/data:[^;]+;base64,[A-Za-z0-9+/=]{500,}/g, "");
  return cleaned.trim();
}
