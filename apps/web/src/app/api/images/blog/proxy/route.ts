import { createApiHandler, errorResponse } from "@/lib/api/handler";

const proxyHandler = createApiHandler(
  async (ctx) => {
    const target = ctx.request.nextUrl.searchParams.get("url") || "";

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

    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return errorResponse("Invalid image URL", 400, {
        correlationId: ctx.correlationId,
      });
    }

    if (parsed.protocol !== "https:") {
      return errorResponse("Only https URLs are allowed", 400, {
        correlationId: ctx.correlationId,
      });
    }

    if (!allowedHosts.has(parsed.hostname)) {
      return errorResponse("Host not allowed", 403, {
        correlationId: ctx.correlationId,
      });
    }

    // Disallow credentials and non-standard ports.
    if (parsed.username || parsed.password || (parsed.port && parsed.port !== "443")) {
      return errorResponse("Invalid image URL", 400, {
        correlationId: ctx.correlationId,
      });
    }

    // Use 302 to let the browser fetch directly.
    return Response.redirect(parsed.toString(), 302);
  },
  {
    requireAuth: false,
    rateLimit: { identifier: "blog_image_proxy", maxRequests: 240, windowMs: 60_000 },
    validateSecurity: false,
  }
);

export const GET = proxyHandler;
