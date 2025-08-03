# Refresh Token Rotation, Reuse Detection, Throttling, and Cookie Behavior

This document describes how Aroosi handles refresh-token rotation, session family handling on misuse, Convex-backed throttling, and cookie behavior across the authentication endpoints.

## Overview

Aroosi uses short-lived access tokens and longer-lived refresh tokens. To protect against stolen refresh-token replay and concurrency races, the system implements:

- Versioned refresh tokens bound to a per-user refreshVersion stored in Convex.
- Single-use rotation: each successful refresh increments refreshVersion, invalidating older refresh tokens.
- Reuse detection via CAS (Compare-And-Swap): the refresh endpoint increments refreshVersion only if it equals the version embedded in the presented refresh token. If not equal, the refresh is rejected as reuse without performing an additional bump.
- Refresh throttling: rate limit refresh attempts by IP and by userId using Convex’s rateLimits store to mitigate brute-force and token spraying.

Related files:
- Refresh endpoint: [src/app/api/auth/refresh/route.ts](src/app/api/auth/refresh/route.ts)
- JWT helpers: [src/lib/auth/jwt.ts](src/lib/auth/jwt.ts)
- Convex helpers: [convex/users.ts](convex/users.ts)
  - getRefreshVersion
  - incrementRefreshVersion
  - casIncrementRefreshVersion
  - incrementRateWithWindow

## Token Semantics

- Access token
  - Type: JWT (HS256)
  - Lifetime: ~15 minutes
  - Purpose: Authorize API requests.
  - Not versioned.

- Refresh token
  - Type: JWT (HS256)
  - Lifetime: ~7 days
  - Includes claim ver (number), which must match the user’s current refreshVersion in Convex for the refresh to be valid.
  - Single-use semantics: after a successful refresh, refreshVersion increments, so the previous refresh token immediately becomes invalid.

## Rotation Flow (CAS-based)

1) Client sends POST /api/auth/refresh with refresh-token cookie.
2) Server applies IP-based throttling prior to token parsing:
   - Key: refresh_ip:{ip}
   - Window: 30 seconds
   - Limit: 10 requests per window
   - On exceed: respond 429 with Retry-After header specifying seconds until reset.
3) Server verifies the refresh token:
   - Ensures typ="refresh"
   - Extracts userId, email, role, ver
4) Server applies user-based throttling:
   - Key: refresh_user:{userId}
   - Window: 30 seconds
   - Limit: 10 requests per window
   - On exceed: respond 429 with Retry-After.
5) Server performs a CAS increment against Convex:
   - Call casIncrementRefreshVersion(userId, expected=ver).
   - If current === expected: increments to nextVersion and returns ok=true.
   - If current !== expected: returns ok=false, treated as refresh-token reuse or stale token.
6) On CAS failure (ok=false):
   - Treat as refresh-token reuse.
   - Clear cookies: auth-token, refresh-token, authTokenPublic.
   - Return 401 with code REFRESH_REUSE.
7) On CAS success (ok=true):
   - Issue new access token and a new refresh token embedding ver=nextVersion.
   - Set cookies accordingly and return 200 with the new access token in response JSON.

This CAS approach guarantees that only one refresh can succeed per version without requiring an extra “family bump.” Any subsequent attempts to reuse the previous refresh token are rejected cleanly.

## Cookie Behavior

The following cookies are managed by the server:

- auth-token
  - Contains the access token.
  - HttpOnly, SameSite=Lax, Secure in production.
  - Max-Age: ~15 minutes.

- refresh-token
  - Contains the refresh token.
  - HttpOnly, SameSite=Lax, Secure in production.
  - Max-Age: ~7 days.

- authTokenPublic (optional)
  - Short-lived public echo of the access token for legacy/client-side reads.
  - Set only if SHORT_PUBLIC_TOKEN=1 in environment variables.
  - SameSite=Lax, Secure in production.
  - If SHORT_PUBLIC_TOKEN is not enabled, the server proactively clears this cookie on refresh for defense-in-depth.

### Cookie Setting and Clearing

- On successful refresh:
  - auth-token and refresh-token are set with new values and updated expirations.
  - authTokenPublic is set only if SHORT_PUBLIC_TOKEN=1; otherwise, it is cleared if present.

- On missing or invalid refresh token:
  - All cookies (auth-token, refresh-token, authTokenPublic) are cleared.
  - Response: 401 with code MISSING_REFRESH or INVALID_REFRESH.

- On reuse detection (CAS failure):
  - No additional bump is performed (CAS already indicates mismatch).
  - All cookies are cleared.
  - Response: 401 with code REFRESH_REUSE.

## Throttling Details

- Storage: persisted in the Convex rateLimits table with by_key index and bigint counters.
- Helpers:
  - incrementRateWithWindow(key, windowMs, limit) updates or initializes a fixed window and increments the count atomically.
  - Returns count, limited boolean, and resetAt (epoch ms).
- Keys used by refresh route:
  - refresh_ip:{ip}
  - refresh_user:{userId}
- Default policy:
  - Window: 30 seconds
  - Limit: 10 requests within the window
  - Response on limit exceeded: HTTP 429 with Retry-After header.

## Environment Variables

- JWT_ACCESS_SECRET: HS256 secret for access tokens.
- JWT_REFRESH_SECRET: HS256 secret for refresh tokens.
- SHORT_PUBLIC_TOKEN: When set to "1", the server will set authTokenPublic alongside auth-token after refresh. Omitted or any other value disables the public cookie and it will be cleared.

## Security Rationale

- Version binding (ver) prevents replay of an old refresh token after a successful rotation.
- CAS-based reuse detection prevents unnecessary family bumps and precisely detects concurrent replay.
- Throttling reduces brute-force and token spraying effectiveness at both IP and user levels.
- HttpOnly cookies protect tokens from JavaScript access.
- SameSite=Lax limits CSRF risk for cookie-based requests.
- Secure flag ensures cookies are transmitted only over HTTPS in production.
- Optional public cookie is disabled by default and explicitly cleared unless SHORT_PUBLIC_TOKEN=1 to minimize exposure.

## Developer Notes

- The /api/auth/me endpoint already forwards Set-Cookie headers received from /api/auth/refresh so that the browser persists updated tokens after a server-initiated refresh.
- When writing new endpoints that may call /api/auth/refresh server-to-server, ensure Set-Cookie headers are forwarded back to the client if the goal is browser persistence.
- If additional session-data needs to be bound to the rotation family, prefer storing it on the user document and rotating by incrementing refreshVersion as the single source of truth.

## Testing Scenarios

- Successful refresh (CAS success):
  - Expect 200, new auth-token/refresh-token set, optional authTokenPublic per SHORT_PUBLIC_TOKEN.

- Reuse detection (CAS failure due to concurrency or stale token):
  - First refresh succeeds.
  - Second refresh using the previously valid token:
    - Expect 401, code REFRESH_REUSE.
    - Cookies cleared.
    - User must sign in again.

- Invalid or missing refresh-token cookie:
  - Expect 401 and cookies cleared.

- SHORT_PUBLIC_TOKEN behavior:
  - When SHORT_PUBLIC_TOKEN=1, verify authTokenPublic is present and short-lived.
  - When disabled, verify authTokenPublic is cleared on refresh.

- Throttling:
  - Exceed 10 requests within 30 seconds for either refresh_ip:{ip} or refresh_user:{userId}:
    - Expect 429 with Retry-After header indicating seconds to wait before retry.
