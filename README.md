# Aroosi: Modern Matrimonial Platform

A production-grade, privacy-first matrimonial platform. This repository highlights a multi-surface architecture (Next.js web, React Native mobile) with a Firebase/Firestore backend and a unified domain model.

This README is focused on exhibiting the project’s complexity and design rather than installation steps.

## System Overview

- Surfaces
  - Web: Next.js App Router
  - Mobile: React Native (Expo)
- Backend/Data
  - Firebase Firestore (primary data store), Firebase Auth (ID token), Firebase Storage (images), Cloud Functions / scheduled jobs (future)
- Identity & Sessions
  - Cookie-first, HttpOnly JWT (access ~15m) + refresh (~7d) issued/validated server-side with Firestore `refreshVersion`
  - OAuth (Google) and native email/password
  - Server-side data access via Firebase Admin SDK (no client tokens forwarded)
- Observability
  - Structured logs across routes with scope, correlationId, type, statusCode, durationMs
  - Middleware decision logging
- Validation
  - Zod schemas with transforms/refinements and cross-field guards
  - E.164 phone normalization and end-to-end enforcement
- CI/CD
  - GitHub Actions + Vercel + Firebase indexes deploy script
  - Environment-driven cookie policies with domain-aware diagnostics

## Architecture Topology

Monorepo highlights:
- web app (Next.js) with edge middleware, cookie-first auth, SSR-friendly data flows
- mobile app (Expo) consuming same domain model (not shown here but referenced)
- shared type modules in `src/types` (Firebase-friendly)

Data access strategy:
- Server-only Firestore access via Firebase Admin (no direct client queries to privileged collections)
- No Authorization header forwarding; identity derived from Firebase ID token cookie + verified JWT
- API routes enforce content-type guards and structured error surfaces

Session lifecycle:
1) Signin/Signup sets `auth-token` (access) and `refresh-token` cookies.
2) `/api/auth/me` returns identity; on 401 client attempts `/api/auth/refresh` (CAS increment of `refreshVersion`).
3) Edge middleware allows hydration paths when refresh cookie exists; blocks protected routes otherwise.

## Recent Features & Changes (2025)

- ProtectedRoute gating (auth, onboarding, profile, plan) unified via declarative props.
- Toast feedback for all access denials (debounced).
- Removed legacy `/create-profile` flow; onboarding gating centralised.
- Completed migration from Convex to Firebase (profiles, usage tracking, subscriptions, messaging, images, analytics, email queue).

## Notable Implementation Details

- Structured Logging: correlationId propagation, timing, status, scoped events.
- Robust Input Handling: strict JSON content-type guards + Zod validation/transforms (height normalization, adult age checks).
- Image Pipeline: client upload -> Firebase Storage signed URL -> metadata persistence -> ordering.
- Onboarding Flow: multi-step wizard with validation snapshots & final atomic profile write.
- Security: HttpOnly cookies, optional public echo cookie disabled by default, strict SameSite/Domain diagnostics.

## Error Surfaces & User Feedback

- Password policy failures surfaced with rule summary & correlationId.
- Validation errors produce concise aggregated messages.

## Operational Diagnostics

- Correlation IDs on auth flows and propagated to logs.
- Rate limiting (Firestore-backed) returns Retry-After.
- Cookie diagnostics warn once per run with actionable hints.

## Complexity Snapshot

- Multi-surface architecture with shared typings
- Cookie-first dual token model + CAS refresh versioning
- Edge middleware gating
- Structured logging taxonomy
- Firebase-centric data & storage management

## Engineering Focus Areas

- Authentication & Sessions: Firebase Auth + custom token rotation layer
- Data Access: Firestore via Admin SDK (no legacy Convex calls)
- Validation: Zod schemas & normalization
- Observability: structured logs + correlation IDs
- Frontend UX: multi-step onboarding, resumable uploads, robust error surfacing
- CI/CD: Firestore index deployment & environment-aware builds

## Roadmap & Quality

- Expand automated tests for refresh flow, rate limiting, and profile gating
- Evaluate migration of scheduled jobs to Cloud Functions

This document is intentionally operations- and architecture-forward to convey system complexity without step-by-step install instructions.
