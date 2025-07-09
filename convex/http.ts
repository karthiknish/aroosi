import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Future: Add any HTTP endpoints for native auth system
// For example: email verification, password reset endpoints
// that interact with external services

// Placeholder for future endpoints
http.route({
  path: "/api/http/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ status: "ok", timestamp: Date.now() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;

 
