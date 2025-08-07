/**
 * Server-only loader for Convex Auth private key.
 * Ensure to set CONVEX_AUTH_PRIVATE_KEY in your environment (.env, host config).
 *
 * NEVER import this module from client components.
 */

export function getConvexPrivateKey(): string {
  const key = process.env.CONVEX_AUTH_PRIVATE_KEY;
  if (!key) {
    // Throwing here makes the failure explicit during route/action invocation
    throw new Error(
      "CONVEX_AUTH_PRIVATE_KEY is missing. Configure it in your environment to enable Convex Auth."
    );
  }
  // Minimal sanity check to avoid accidental misconfiguration
  if (!key.includes("BEGIN") || !key.toUpperCase().includes("PRIVATE KEY")) {
    throw new Error(
      "CONVEX_AUTH_PRIVATE_KEY appears invalid. It should contain a PEM-formatted private key."
    );
  }
  return key;
}

/**
 * Optionally assert server context.
 * Useful if this module is accidentally imported in a client bundle.
 */
export function assertServerOnly(): void {
  if (typeof window !== "undefined") {
    throw new Error("convexKeys.server.ts was imported in a client-side context. This is not allowed.");
  }
}