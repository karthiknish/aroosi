# Refresh Token Rotation, Reuse Detection, Throttling, and Cookie Behavior

This document describes how Aroosi handles refresh-token rotation, session family handling on misuse, Firestore-backed throttling (post-Convex migration), and cookie behavior across the authentication endpoints.

## Overview

Aroosi uses short-lived access tokens and longer-lived refresh tokens. To protect against stolen refresh-token replay and concurrency races, the system implements:

- Versioned refresh tokens bound to a per-user `refreshVersion` stored on the user record in Firestore.
- Single-use rotation: each successful refresh increments `refreshVersion`, invalidating older refresh tokens.
- Reuse detection via CAS-like compare/update: the refresh endpoint updates `refreshVersion` only if it equals the version embedded in the presented refresh token. If not equal, the refresh is rejected as reuse.
- Refresh throttling: rate limit refresh attempts by IP and by userId using a Firestore collection (replacing previous Convex `rateLimits`).

Related files:
- Refresh endpoint: `src/app/api/auth/refresh/route.ts`
- JWT helpers: `src/lib/auth/jwt.ts`
- Throttling helpers: `src/lib/auth/rateLimit.ts` (or equivalent Firestore utility)

## Token Semantics

- Access token
  - Type: JWT (HS256)
  - Lifetime: ~15 minutes
  - Purpose: Authorize API requests.
  - Not versioned.

- Refresh token
  - Type: JWT (HS256)
  - Lifetime: ~7 days
  - Includes claim `ver` (number), which must match the user’s current `refreshVersion` in Firestore for the refresh to be valid.
  - Single-use semantics: after a successful refresh, `refreshVersion` increments, so the previous refresh token immediately becomes invalid.

## Rotation Flow (Compare-and-Set)

1) Client sends POST `/api/auth/refresh` with `refresh-token` cookie.
2) Server applies IP-based throttling prior to token parsing:
   - Key: `refresh_ip:{ip}`
   - Window: 30 seconds
   - Limit: 10 requests per window
   - On exceed: respond `429` with `Retry-After` header.
3) Server verifies the refresh token:
   - Ensures `typ="refresh"`
   - Extracts `userId`, `email`, `role`, `ver`.
4) Server applies user-based throttling:
   - Key: `refresh_user:{userId}` (same window/limit)
5) Server performs atomic compare/update against the stored `refreshVersion`:
   - If stored value === `ver`: increment and proceed.
   - Else: treat as reuse/stale token -> reject.
6) On compare/update failure:
   - Treat as refresh-token reuse.
   - Clear cookies: `auth-token`, `refresh-token`, `authTokenPublic`.
   - Return 401 with code `REFRESH_REUSE`.
7) On success:
   - Issue new access & refresh tokens (with new `ver`).
   - Set cookies and return 200.

## Cookie Behavior

Cookies:
- `auth-token` (access token) – HttpOnly, SameSite=Lax, Secure (prod), Max-Age ~15m.
- `refresh-token` (refresh token) – HttpOnly, SameSite=Lax, Secure (prod), Max-Age ~7d.
- `authTokenPublic` (optional) – only if `SHORT_PUBLIC_TOKEN=1`.

### Setting and Clearing
- Successful refresh: sets new `auth-token` & `refresh-token`; sets or clears `authTokenPublic` depending on flag.
- Missing/invalid/expired token: clears all and returns 401.
- Reuse detection: clears all and returns 401 `REFRESH_REUSE`.

## Throttling Details

Implemented with a Firestore collection (e.g. `rateLimits`) containing documents:
`{ key: string, windowStart: number, count: number }`.

Fixed window algorithm:
- On attempt: load doc by key.
- If absent: create with count=1.
- If expired (`now - windowStart > windowMs`): reset `windowStart=now`, `count=1`.
- Else increment `count`.
- If `count > limit`: reject and compute `retryAfter` = `windowStart + windowMs - now`.

Keys used:
- `refresh_ip:{ip}`
- `refresh_user:{userId}`

Policy: window 30s, limit 10.

## Environment Variables

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `SHORT_PUBLIC_TOKEN` (optional)

## Security Rationale

- Version binding prevents replay after rotation.
- Atomic compare/update precisely detects concurrent reuse.
- Dual-layer throttling reduces brute-force impact.
- HttpOnly + Secure + SameSite cookies mitigate XSS/CSRF risks.
- Public token cookie disabled by default to minimize exposure.

## Developer Notes

- `/api/auth/me` should forward `Set-Cookie` headers from refresh responses so the browser updates tokens on server-driven refresh.
- When composing server-to-server calls that perform refresh, always propagate updated cookies if the client relies on browser persistence.
- Store only the minimal `refreshVersion` integer on the user record; additional per-session metadata can be layered if needed.

## Testing Scenarios

1. Successful refresh – expect 200, new cookies.
2. Reuse (second attempt with old token) – expect 401 `REFRESH_REUSE`, cookies cleared.
3. Missing cookie – 401 `MISSING_REFRESH`, cookies cleared.
4. Throttling exceeded – 429 with `Retry-After` header.
5. Public cookie flag toggling – ensure `authTokenPublic` only present when enabled.
