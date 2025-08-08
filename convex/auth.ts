/* convex/auth.ts
 * Convex Auth bootstrap + helpers.
 * - Initializes Convex Auth with the Password provider so /api/auth flows work.
 * - Exposes helpers to retrieve the authenticated identity in Convex functions.
 *
 * Docs: https://labs.convex.dev/auth/setup/manual and https://labs.convex.dev/auth/config/passwords
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { api } from "@convex/_generated/api";
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

// Initialize Convex Auth (add more providers later if needed)
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});

// Minimal identity shape we expect after authentication
export const identitySchema = v.object({
  subject: v.string(), // stable subject id from provider
  email: v.optional(v.string()),
  name: v.optional(v.string()),
  picture: v.optional(v.string()),
  provider: v.optional(v.string()),
});

// Utility: validate we have an identity in actions/queries that require auth
export const requireIdentity = action({
  args: {},
  handler: async (ctx): Promise<{ subject: string; email?: string; name?: string; picture?: string; provider?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHENTICATED");
    }
    return {
      subject: identity.subject,
      email: (identity as any).email,
      name: (identity as any).name,
      picture: (identity as any).picture,
      provider: (identity as any).provider,
    };
  },
});

/**
 * Example: Post-sign-in consolidation
 * - Called after a successful provider sign-in to ensure a user document exists.
 * - Upsert user/profile records keyed by available identity traits.
 *
 * Implementation notes:
 * - Uses email as the primary lookup due to available index 'by_email' on users.email.
 * - Query and mutation live in convex/users.ts and are referenced via generated api to work with runQuery/runMutation.
 */
export const consolidateUserAfterAuth = action({
  args: {
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    picture: v.optional(v.string()),
    googleId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ ok: true; userId: Id<"users"> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHENTICATED");

    const email = (args.email ?? (identity as any).email ?? "").trim();
    if (!email) {
      throw new Error("EMAIL_REQUIRED");
    }

    const mask = (e?: string) => {
      if (!e) return "";
      const [n, d] = e.split("@");
      const first = (n?.[0] ?? "*") + "***";
      return d ? `${first}@${d}` : first;
    };
    // eslint-disable-next-line no-console
    console.info("convex.auth.consolidate:start", {
      email: mask(email),
      hasName: Boolean(args.name ?? (identity as any).name),
      hasPicture: Boolean(args.picture ?? (identity as any).picture),
      hasGoogleId: Boolean(args.googleId ?? (identity as any).googleId),
    });

    // Look up existing user via email (server-side query reference)
    const existing = await ctx.runQuery(api.users.findUserByEmail, { email });
    if (existing) {
      return { ok: true, userId: existing._id as Id<"users"> };
    }

    // Create user + profile via mutation (server-side mutation reference)
    const userDocId = await ctx.runMutation(api.users.createUserAndProfile, {
      email,
      name: args.name ?? (identity as any).name,
      picture: args.picture ?? (identity as any).picture,
      googleId: args.googleId ?? (identity as any).googleId,
    });

    // eslint-disable-next-line no-console
    console.info("convex.auth.consolidate:done", {
      email: mask(email),
      userId: String(userDocId),
    });
    return { ok: true, userId: userDocId as Id<"users"> };
  },
});
