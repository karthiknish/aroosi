/**
 * Minimal HTML sanitization utilities for Convex runtime (no DOM libraries).
 * This is a conservative sanitizer that:
 * - Removes <script>, <style>, <iframe>, <object>, <embed> blocks entirely
 * - Removes inline event handlers (on*)
 * - Neutralizes javascript: and data: URLs in href/src
 * - Optionally strips unknown tags when needed (not enabled by default)
 *
 * NOTE: This is not as comprehensive as DOMPurify. For high-risk content,
 * consider integrating a battle-tested sanitizer.
 */

function stripBlockTag(html: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>[\s\S]*?<\/${tag}>`, "gi");
  return html.replace(re, "");
}

function removeEventHandlers(html: string): string {
  // Remove attributes like onclick="..." or onload='...'
  return html.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

function neutralizeDangerousUrls(html: string): string {
  // Replace javascript: or data: URLs in href/src with '#'
  return html
    .replace(/\s(href|src)\s*=\s*("|')\s*javascript:[^"']*("|')/gi, " $1='#'")
    .replace(/\s(href|src)\s*=\s*("|')\s*data:[^"']*("|')/gi, " $1='#'");
}

export function sanitizeHtml(input: unknown): string {
  if (typeof input !== "string") return "";
  let html = input;
  // Remove dangerous blocks first
  html = stripBlockTag(html, "script");
  html = stripBlockTag(html, "style");
  html = stripBlockTag(html, "iframe");
  html = stripBlockTag(html, "object");
  html = stripBlockTag(html, "embed");

  // Remove inline handlers and dangerous URLs
  html = removeEventHandlers(html);
  html = neutralizeDangerousUrls(html);

  // Basic length cap
  if (html.length > 200_000) {
    html = html.slice(0, 200_000);
  }
  return html;
}

export function sanitizePlainText(input: unknown, maxLen = 2000): string {
  if (typeof input !== "string") return "";
  let s = input.replace(/[<>"'&]/g, "").trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

export function sanitizeSlug(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/\-+/g, "-")
    .replace(/^\-+|\-+$/g, "");
}


