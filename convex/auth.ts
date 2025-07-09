import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { Id } from './_generated/dataModel';

// User management functions

export const createUser = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    fullName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Create user
    const userId = await ctx.db.insert('users', {
      email: args.email,
      passwordHash: args.passwordHash,
      emailVerified: false,
      createdAt: now,
      loginAttempts: 0,
    });

    // Create profile
    await ctx.db.insert('profiles', {
      userId,
      fullName: args.fullName,
      isProfileComplete: false,
      isOnboardingComplete: false,
      createdAt: now,
      email: args.email,
    });

    return userId;
  },
});

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first();
  },
});

export const getUserById = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const updatePassword = mutation({
  args: {
    userId: v.id('users'),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
      updatedAt: Date.now(),
    });
  },
});

export const verifyEmail = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      emailVerified: true,
      updatedAt: Date.now(),
    });
  },
});

export const incrementLoginAttempts = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    const attempts = (user.loginAttempts || 0) + 1;
    const now = Date.now();
    
    // Lock account after 5 failed attempts for 30 minutes
    const updates: any = {
      loginAttempts: attempts,
      updatedAt: now,
    };

    if (attempts >= 5) {
      updates.lockedUntil = now + (30 * 60 * 1000); // 30 minutes
    }

    await ctx.db.patch(args.userId, updates);
  },
});

export const resetLoginAttempts = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      loginAttempts: 0,
      lockedUntil: undefined,
      lastLoginAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Session management functions

export const createSession = mutation({
  args: {
    userId: v.id('users'),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days

    // Generate session token
    const sessionToken = crypto.randomUUID();

    const sessionId = await ctx.db.insert('sessions', {
      userId: args.userId,
      token: sessionToken,
      expiresAt,
      createdAt: now,
      lastActivity: now,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });

    return sessionId;
  },
});

export const getSession = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const updateSessionActivity = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      lastActivity: Date.now(),
    });
  },
});

export const deleteSession = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.sessionId);
  },
});

export const invalidateAllUserSessions = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
  },
});

// Clean up expired sessions
export const cleanupExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredSessions = await ctx.db
      .query('sessions')
      .withIndex('by_expiresAt', (q) => q.lt('expiresAt', now))
      .collect();

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id);
    }
  },
});

// Verification token management

export const createVerificationToken = mutation({
  args: {
    userId: v.id('users'),
    token: v.string(),
    type: v.union(
      v.literal('email_verification'),
      v.literal('password_reset'),
      v.literal('email_change')
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = args.type === 'password_reset' 
      ? now + (60 * 60 * 1000) // 1 hour for password reset
      : now + (24 * 60 * 60 * 1000); // 24 hours for email verification

    // Delete any existing tokens of the same type for this user
    const existingTokens = await ctx.db
      .query('verificationTokens')
      .withIndex('by_userId_type', (q) => 
        q.eq('userId', args.userId).eq('type', args.type)
      )
      .collect();

    for (const token of existingTokens) {
      await ctx.db.delete(token._id);
    }

    // Create new token
    return await ctx.db.insert('verificationTokens', {
      userId: args.userId,
      token: args.token,
      type: args.type,
      expiresAt,
      createdAt: now,
    });
  },
});

export const getVerificationToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('verificationTokens')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first();
  },
});

export const useVerificationToken = mutation({
  args: { tokenId: v.id('verificationTokens') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tokenId, {
      usedAt: Date.now(),
    });
  },
});

// Clean up expired verification tokens
export const cleanupExpiredTokens = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredTokens = await ctx.db
      .query('verificationTokens')
      .filter((q) => q.lt(q.field('expiresAt'), now))
      .collect();

    for (const token of expiredTokens) {
      await ctx.db.delete(token._id);
    }
  },
});

// Admin functions

export const banUser = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    // TODO: Add admin auth check
    await ctx.db.patch(args.userId, {
      banned: true,
      updatedAt: Date.now(),
    });

    // Invalidate all user sessions
    await invalidateAllUserSessions(ctx, { userId: args.userId });
  },
});

export const unbanUser = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    // TODO: Add admin auth check
    await ctx.db.patch(args.userId, {
      banned: false,
      updatedAt: Date.now(),
    });
  },
});

export const setUserRole = mutation({
  args: {
    userId: v.id('users'),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    // TODO: Add admin auth check
    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });
  },
});

// Analytics functions

export const getUserStats = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    const sessions = await ctx.db.query('sessions').collect();
    const now = Date.now();
    
    return {
      totalUsers: users.length,
      verifiedUsers: users.filter(u => u.emailVerified).length,
      bannedUsers: users.filter(u => u.banned).length,
      activeSessions: sessions.filter(s => s.expiresAt > now).length,
      usersCreatedToday: users.filter(u => u.createdAt > now - 24 * 60 * 60 * 1000).length,
    };
  },
});