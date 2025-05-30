---
description:
globs:
alwaysApply: false
---
# NPM Install Rule: Use --legacy-peer-deps

When installing new npm packages in this project, **always use the `--legacy-peer-deps` flag**:

```
npm install <package-name> --legacy-peer-deps
```

This avoids dependency resolution errors and ensures compatibility with the current lockfile and package versions.

If you forget this flag, you may encounter errors or failed installs.
