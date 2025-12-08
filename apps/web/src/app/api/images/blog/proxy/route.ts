import { NextRequest } from "next/server";

// GET /api/images/blog/proxy?url=...
// A thin passthrough to validate absolute http(s) blog image URLs and redirect.
export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const target = u.searchParams.get("url") || "";
  if (!/^https?:\/\//i.test(target)) {
    return new Response("Invalid image URL", { status: 400 });
  }
  // Basic allowlist: common hosts we expect; expand as needed
  const allowedHosts = new Set([
    "firebasestorage.googleapis.com",
    "storage.googleapis.com",
    "aroosi-project.firebasestorage.app",
    "images.pexels.com",
    "images.squarespace-cdn.com",
    "img.clerk.com",
    "images.clerk.dev",
    "i.pinimg.com",
    "aroosi.app",
    "www.aroosi.app",
  ]);
  try {
    const parsed = new URL(target);
    if (!allowedHosts.has(parsed.hostname)) {
      return new Response("Host not allowed", { status: 403 });
    }
    // Use 302 to let the browser fetch directly
    return Response.redirect(parsed.toString(), 302);
  } catch {
    return new Response("Invalid image URL", { status: 400 });
  }
}
