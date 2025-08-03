# Aroosi: Modern Matrimonial Platform

A production-grade, privacy-first matrimonial platform. This repository highlights a multi-surface architecture (Next.js web, React Native mobile) with a typed backend (Convex) and a unified domain model.

This README is focused on exhibiting the project’s complexity and design rather than installation steps.

## System Overview

- Surfaces
  - Web: Next.js App Router
  - Mobile: React Native (Expo)
- Backend/Data
  - Convex (actions, queries, rate-limiting, atomic writes)
- Identity & Sessions
  - Cookie-first, HttpOnly JWT (access ~15m) + refresh (~7d)
  - OAuth (Google) and native email/password
  - Server-side fetches to Convex without Authorization headers
- Observability
  - Structured logs across routes with scope, correlationId, type, statusCode, durationMs
  - Middleware decision logging
- Validation
  - Zod schemas with transforms/refinements and cross-field guards
  - E.164 phone normalization and end-to-end enforcement
- CI/CD
  - GitHub Actions: environment variable provisioning (e.g., STRIPE_SECRET_KEY), monorepo-aware working directories
  - Vercel: environment-driven cookie policies with domain-aware diagnostics

## Architecture Topology

Monorepo highlights:
- apps/web: Next.js app, edge middleware, cookie-first auth, SSR-friendly data flows
- apps/mobile: Expo app consuming the same domain model
- packages/shared-types: Cross-surface TypeScript types
- convex: Convex schema, actions, queries, rate-limits

Data access strategy:
- Server-only Convex access via actions/queries
- No Authorization header forwarding from clients; identity derived from server session cookies
- Middle-tier API routes enforce content-type guards and structured error surfaces

Session lifecycle:
1) Signup/Signin issue Set-Cookie for auth-token and refresh-token with centralized attributes.
2) AuthProvider fetches /api/auth/me; on 401, transparently attempts /api/auth/refresh and rehydrates.
3) Edge middleware allows hydration paths when a refresh-token exists, blocking protected routes otherwise.

## Notable Implementation Details

- Structured Logging
  - Fields: scope, correlationId, type, statusCode, durationMs
  - Success/early-return coverage on signin, signup, refresh, me
  - Consistent middleware logs with decision hints
- Robust Input Handling
  - Content-Type guards for JSON parsing
  - Zod-based schemas with transforms for height normalization ("170 cm") and adult age checks
  - E.164 phone normalization via shared utilities and last-mile server guards
- Image Pipeline
  - Client-side local uploads -> server-issued upload URL -> Convex storageId capture -> server save metadata -> order persistence
  - Aggregated error reporting for partial upload failures
- Onboarding Flow
  - ProfileWizard context spans steps with validation snapshots
  - Auto-submit profile after auth success with duplicate-profile server guard
- Security
  - HttpOnly cookies for access/refresh; optional short public echo cookie gated by env
  - Centralized cookie attribute builder with runtime diagnostics to catch domain/secure/samesite misconfig


## Error Surfaces & User Feedback

- Password policy failures (server type=password_policy) are surfaced in the onboarding signup UI with a clear rule summary and correlationId reference.
- Validation errors provide summarized field lists; Zod issues are compacted into user-readable messages.

## Operational Diagnostics

- Correlation IDs accompany all auth route responses and are propagated to logs to enable cross-cut tracing.
- Rate-limiting logs include Retry-After hints.
- Cookie diagnostics log a single aggregated warning with the current effective SameSite/Secure/Domain and actionable suggestions.

## Complexity Snapshot

- Multi-surface monorepo with shared type system
- Cookie-first session model with rotation and auto-refresh
- Strict content-type and schema validation with transforms
- Edge middleware gating with hydration allowance
- Image upload orchestration with resumable error handling
- Structured logging taxonomy for rapid incident triage
- CI/CD considerations for secret provisioning and monorepo builds
- Environment-sensitive cookie diagnostics for production vs preview domains

## Engineering Focus Areas

- Authentication and Sessions: Cookie-first, short-lived access tokens with rotating refresh, hydration-aware middleware.
- Data Access: Server-only Convex calls via actions/queries, with content-type guarded API routes.
- Validation: Zod-based schemas with transforms and normalization (e.g., height formatting, adult age checks, E.164 phones).
- Observability: Correlation ID–driven structured logging with timing and outcome typing.
- Frontend Experience: Multi-step onboarding with live validation, resumable image upload pipeline, and robust error surfacing.
- CI/CD: Monorepo-aware jobs and environment-driven runtime behavior.


## Roadmap & Quality

- Phone E.164 end-to-end smoke tests for +1, +44, +91
- Expand integration tests for session rotation and middleware hydration paths
- Optional: gate verbose middleware logs by environment

This document is intentionally operations- and architecture-forward to convey the system’s complexity and design choices without duplicating installation steps.
