---
description:
globs:
alwaysApply: false
---
# No 'any' Types Rule

Never use `any` as a type in this codebase. Always use specific types, `unknown`, or type guards instead. If you are unsure of the type, prefer `unknown` and use type guards to narrow as needed. This rule applies to all TypeScript files and all type annotations, including function parameters, return types, state, and props.
