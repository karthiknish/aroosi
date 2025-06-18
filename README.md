# Aroosi: Modern Matrimonial Platform

A full-stack matrimonial platform built with modern technologies and a unified monorepo architecture.

## 🏗️ Architecture

This project uses a **monorepo structure** with shared packages for maximum code reuse between web and mobile applications.

### Project Structure

```
aroosi/
├── apps/
│   ├── web/          # Next.js web application
│   └── mobile/       # React Native mobile app (Expo)
├── packages/
│   ├── shared-types/    # Shared TypeScript types
│   ├── shared-utils/    # Shared utility functions
│   ├── auth/           # Shared authentication (Clerk)
│   ├── convex-client/  # Shared Convex client utilities
│   └── ui/             # Shared UI components
├── convex/           # Backend functions and schema
└── __tests__/        # Shared test files
```

### Technology Stack

- **Frontend**: Next.js 15 (web) + React Native/Expo (mobile)
- **Authentication**: Clerk (shared across platforms)
- **Database**: Convex (real-time, serverless)
- **Styling**: Tailwind CSS 4.0
- **Type Safety**: TypeScript with shared types
- **State Management**: React Query + React Context

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Convex CLI: `npm install -g convex`
- Expo CLI (for mobile): `npm install -g @expo/cli`

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repo-url>
cd aroosi
npm run install:all
```

2. **Set up environment variables:**
```bash
cp .env.aroosi.example .env.local
# Fill in your API keys and configuration
```

3. **Start development servers:**

**Web application:**
```bash
npm run dev:web
# Opens http://localhost:3000
```

**Mobile application:**
```bash
npm run dev:mobile
# Opens Expo development server
```

**Convex backend:**
```bash
npm run convex:dev
```

### Development Commands

```bash
# Development
npm run dev          # Start web app
npm run dev:web      # Start web app
npm run dev:mobile   # Start mobile app
npm run convex:dev   # Start Convex backend

# Building
npm run build        # Build web app
npm run build:web    # Build web app
npm run build:mobile # Build mobile app

# Testing & Quality
npm run test         # Run tests
npm run lint         # Lint both apps
npm run type-check   # TypeScript checking

# Deployment
npm run convex:deploy # Deploy Convex functions
```

## Convex Admin & Cleanup Scripts

### Preventing Duplicate Users
- The backend is protected against duplicate Clerk IDs (race conditions) by a defensive double-check before insert.
- **Enable Clerk account linking** in your Clerk dashboard to prevent multiple Clerk IDs for the same email.

### Cleaning Up Duplicates

#### 1. Find Duplicate Clerk IDs
```sh
npx convex run scripts/cleanupDuplicateClerkUsers:findDuplicateClerkUsers
```

#### 2. Clean Up Duplicates for a Clerk ID
```sh
npx convex run scripts/cleanupDuplicateClerkUsers:cleanupDuplicateClerkUsers --clerkId="the-clerk-id"
```

#### 3. (Optional) Find Duplicates by Email
If you want to merge users with the same email but different Clerk IDs, ask for a script or see Convex/Clerk docs.

## Clerk Account Linking (Recommended)
- Go to your [Clerk dashboard](https://dashboard.clerk.com/).
- Navigate to **User & Authentication > Settings > Account Linking**.
- Enable "Automatic Account Linking" to prevent duplicate users for the same email.
- See [Clerk Docs: Account Linking](https://clerk.com/docs/users/account-linking)

## SEO & Meta Tags
- Use the `<Head>` component in Next.js to add meta tags for SEO and social sharing.
- Example:
```jsx
import Head from "next/head";

<Head>
  <title>Aroosi - Find Your Ideal Match</title>
  <meta name="description" content="Aroosi is a modern matrimonial platform for the UK Muslim community." />
  <meta property="og:title" content="Aroosi - Find Your Ideal Match" />
  <meta property="og:description" content="Aroosi is a modern matrimonial platform for the UK Muslim community." />
  <meta property="og:image" content="/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
</Head>
```
- Place this in your `app/layout.tsx` or individual pages for best results.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Convex Documentation](https://docs.convex.dev/) - learn about Convex backend/database.
- [Clerk Documentation](https://clerk.com/docs) - learn about authentication and account linking.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
