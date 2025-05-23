# Aroosi: Next.js + Convex + Clerk Matrimonial Platform

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app), using [Convex](https://convex.dev) for backend/database and [Clerk](https://clerk.com/) for authentication.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

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
