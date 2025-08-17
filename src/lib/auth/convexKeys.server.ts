/**
 * Deprecated: Convex Auth key loader removed after Firebase migration.
 * This file is retained temporarily to avoid stale imports and can be deleted.
 */
export function getConvexPrivateKey(): never {
  throw new Error(
    "Convex Auth deprecated; remove usages of getConvexPrivateKey()."
  );
}
export function assertServerOnly(): void {
  /* no-op */
}