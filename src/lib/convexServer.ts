// Deprecated legacy Convex server helpers removed after Firebase migration.
// This file remains temporarily as an inert stub so that any stale imports
// produce a clear runtime error rather than reintroducing Convex logic.
// Safe to delete once no references exist in the codebase.

export function convexQueryWithAuth(): never {
  throw new Error(
    "convexQueryWithAuth removed – migrate to Firestore access layer."
  );
}
export function convexMutationWithAuth(): never {
  throw new Error(
    "convexMutationWithAuth removed – migrate to Firestore access layer."
  );
}
export const convexUsers: never = undefined as never;
