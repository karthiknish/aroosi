# Removing Deprecated Convex Artifacts

These files are now unused after Firebase/Firestore migration and can be safely deleted once you confirm no external imports remain:

- `src/lib/convexServer.ts`
- `src/lib/convexClient.ts`
- `src/lib/storage/convexStorage.ts`

## Verification Steps
1. Global search for `convexServer`, `convexClient`, `convexMutationWithAuth`, `convexQueryWithAuth`, `ConvexHttpClient`.
2. Ensure only comments or deprecated file contents reference Convex.
3. Run TypeScript compile to confirm no missing imports after deletion.

## Deletion (example commands)
```bash
# Optional: create a git branch first
git checkout -b chore/remove-convex-artifacts
rm src/lib/convexServer.ts src/lib/convexClient.ts src/lib/storage/convexStorage.ts
npm run typecheck
git add . && git commit -m "chore: remove deprecated Convex helper files"
```

## Rationale
All runtime API routes now use Firestore/Firebase Admin equivalents. Keeping these files risks confusion and accidental reintroduction of Convex dependencies.

---
Add any future deprecation notes here.
