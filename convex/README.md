# (Deprecated) Legacy Convex Directory

This directory previously contained Convex function implementations. The backend has been fully migrated to Firebase (Auth, Firestore, Storage) and all Convex code has been decommissioned.

Current state:
- All `.ts` source files export nothing (`export {}`) so TypeScript treats them as modules while we finalize physical removal.
- Generated Convex artifacts are no longer referenced by the application.
- This folder will be deleted in a subsequent cleanup once any lingering imports are verified absent.

If you encounter new code re‑introducing Convex imports, remove it—Convex is no longer part of the architecture.

Safe to delete after confirming a clean `npm run type-check` and runtime smoke tests without this directory.

Last updated as part of Convex decommission migration.
