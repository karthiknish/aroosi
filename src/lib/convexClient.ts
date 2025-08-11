import { ConvexReactClient } from "convex/react";

// Create Convex client instance
export const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);