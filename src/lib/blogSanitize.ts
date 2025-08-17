// Basic blog sanitization helpers migrated from Convex utilities
// NOTE: For rich HTML content, a more robust sanitizer (e.g. DOMPurify) should be applied server-side.

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
  // Minimal sanitation: strip script/style tags. For production, integrate a full HTML sanitizer.
  let out = String(html || "");
  out = out.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  return out.trim();
}
