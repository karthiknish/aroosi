# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aroosi is an Afghan matrimony platform built with Next.js 15. This is the web application that connects Afghan singles through profile matching, messaging, and subscription-based premium features.

## Development Commands

### Primary Commands (run from root)
- `npm run dev` - Start Next.js development server on port 3000
- `npm run build` - Build the web application for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint on the web app
- `npm run type-check` - Run TypeScript type checking across the project
- `npm run test` - Run Jest unit tests

### Testing Commands
- `npx jest` - Run all unit tests
- `npx playwright test` - Run end-to-end tests (requires server running)
- `npx playwright test --ui` - Run Playwright tests in interactive UI mode
- `npx playwright show-report` - Open test results report

### Convex Database Commands
- `npx convex dev` - Start Convex development environment
- `npx convex deploy` - Deploy Convex functions to production
- `npx convex run scripts/cleanupDuplicateUsers:findDuplicateUsers` - Find duplicate user entries
- `npx convex run scripts/cleanupDuplicateUsers:cleanupDuplicateUsers --userId="user-id"` - Clean up specific duplicate users

## Architecture Overview

### Project Structure
- **src/** - Next.js web application source code
- **convex/** - Backend database functions and schema
- **public/** - Static assets
- **e2e/** - End-to-end tests

### Technology Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Authentication**: Native JWT-based auth (OAuth + email/password)
- **Database**: Convex (real-time, serverless)
- **Styling**: Tailwind CSS 4.0, shadcn/ui components
- **State Management**: React Query for server state, React Context for auth
- **Forms**: React Hook Form with Zod validation
- **Payments**: Stripe integration
- **Testing**: Jest (unit), Playwright (e2e)
- **Rich Text**: TipTap editor for blog posts and messaging

### Key Path Mappings (TypeScript)
```typescript
"@/*": ["./src/*"]
"@/lib/*": ["./src/lib/*"]
"@convex/*": ["./convex/*"]
```

## Authentication & User Flow

### User States
1. **Unauthenticated** - Native auth handles sign-in/sign-up
2. **Authenticated but no profile** - Redirected to profile creation wizard
3. **Profile incomplete** - Guided through 6-step completion process
4. **Profile pending approval** - Admin must approve before search access
5. **Active user** - Full platform access based on subscription tier

### Protected Route Structure
- **Public**: `/`, `/about`, `/pricing`, `/privacy`, `/terms`, `/blog/*`
- **Auth Required**: `/sign-in`, `/sign-up` (Native auth pages)
- **Profile Required**: `/search`, `/matches/*`, `/profile/*`, `/premium-settings`
- **Admin Only**: `/admin/*` (role-based access)

## Database Schema (Convex)

### Core Tables
- **users** - Native auth integration, basic user data, roles
- **profiles** - Detailed matrimonial profiles, preferences, completion status
- **interests** - Like/reject interactions between users
- **messages** - Real-time messaging system with conversation tracking
- **images** - Profile photo storage with ordering support
- **blogPosts** - CMS for blog content
- **profileViews** - Track who viewed whose profile

### Key Relationships
- Users (1) → Profiles (1) - One profile per user
- Users (M) → Interests (M) - Mutual matching system
- Users (M) → Messages (M) - Conversation-based messaging
- Profiles (1) → Images (M) - Multiple photos per profile

## Business Logic Patterns

### Profile Management
- **6-step wizard**: Basic Info → Location → Cultural → Education → About → Photos
- **Completion tracking**: `isProfileComplete` and `isOnboardingComplete` flags
- **Admin approval**: `isApproved` flag controls search visibility
- **Image handling**: Upload to Convex storage, maintain order, crop/resize support

### Matching System
- **Interest-based**: Users send interests, recipients accept/reject
- **Mutual matches**: Both users must accept to enable messaging
- **Search filters**: Age, location, education, lifestyle preferences
- **Premium features**: Profile boosting, unlimited messaging, advanced filters

### Subscription Tiers
- **Free**: Limited messaging, basic search, profile views
- **Premium (£14.99/month)**: Unlimited messaging, profile boost, advanced search
- **Premium Plus (£39.99/month)**: All Premium features + priority support

## API Patterns

### Authentication Flow
```typescript
// All API routes use JWT token validation
const token = headers().get("authorization")?.replace("Bearer ", "");
const userData = await fetchQuery(api.users.getCurrentUserWithProfile, {}, { token });
```

### Error Handling
- Consistent error responses with `apiResponse` utility
- Rate limiting on sensitive endpoints
- Validation using Zod schemas
- Graceful fallbacks for offline/network issues

### Real-time Features
- Convex subscriptions for live messaging
- Push notifications via OneSignal
- Optimistic updates for better UX

## Code Style & Standards

### TypeScript Rules
- **Never use `any`** - Use `unknown` with type guards instead
- Strict type checking enabled across the project
- Comprehensive type definitions in `src/types/`

### Component Patterns
- Prefer server components when possible (Next.js App Router)
- Use client components only when needed (interactivity, state)
- Props interfaces defined inline or in types files
- Consistent error boundaries and loading states

### File Organization
- Feature-based organization in `components/`
- Shared utilities in `lib/` with specific subdirectories
- API routes mirror page structure
- Test files co-located with implementation

## Security Considerations

### Data Protection
- GDPR compliance features (data export, deletion)
- Profile visibility controls (`hiddenFromSearch` flag)
- Content moderation (admin approval system)
- Secure image upload with validation

### Rate Limiting
- Convex rate limiting for abuse prevention
- Stripe webhook signature validation
- CSRF protection on sensitive operations

## Development Workflow

### Before Making Changes
1. Check existing patterns in similar components/pages
2. Verify authentication requirements for new routes
3. Consider mobile responsiveness (mobile app exists)
4. Test with different user states and subscription tiers

### Code Quality
- Run `npm run lint` and `npm run type-check` before committing
- Add tests for new utilities and API endpoints
- Follow existing naming conventions and file structure
- Update types when adding new fields to database schema

### Deployment Considerations
- Web app deploys to Vercel
- Convex functions deploy separately
- Environment variables required for JWT auth, Stripe, OneSignal