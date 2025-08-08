import { ConvexHttpClient } from "convex/browser";

// Create a Convex HTTP client for server-side usage
export const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);