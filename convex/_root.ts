
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

// Mount Convex Auth routes at /api/auth
auth.addHttpRoutes(http);

// ✅ Correct way to add GET /
http.route({
  path: "/",
  method: "GET",
  handler: httpAction(async (_ctx: any, _request: Request) => {
    return new Response("Convex backend is live ✅", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }),
});

// Export auth to make it available to Convex
export { auth };
export default http;