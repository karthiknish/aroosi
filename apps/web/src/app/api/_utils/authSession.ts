// Deprecated Convex-based auth session utility removed after Firebase migration.
// Any residual import of getSessionFromRequest should be replaced with the
// Firebase session resolver (see src/lib/auth/*).
export function getSessionFromRequest(): never {
  throw new Error(
    "getSessionFromRequest (Convex) removed – use Firebase auth session utilities instead."
  );
}
