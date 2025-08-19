/**
 * Firestore Schema & Helper Utilities
 * -----------------------------------
 * Central definitions for collections replacing legacy Convex modules.
 * Keep side-effect free; only exports types + pure builders.
 */

export type TimestampMillis = number;

// interests
export interface FSInterest {
  id?: string;
  fromUserId: string;
  toUserId: string;
  // Expanded statuses to cover previous Convex implementation semantics
  status: 'pending' | 'accepted' | 'rejected' | 'reciprocated' | 'withdrawn';
  createdAt: TimestampMillis;
  updatedAt: TimestampMillis;
  fromSnapshot?: { fullName?: string; age?: number; city?: string; image?: string };
  toSnapshot?: { fullName?: string; age?: number; city?: string; image?: string };
}
export const buildInterest = (p: Omit<FSInterest,'createdAt'|'updatedAt'>): FSInterest => {
  const now = Date.now();
  return { ...p, createdAt: now, updatedAt: now };
};

// profileViews
export interface FSProfileView { id?: string; viewerId: string; viewedId: string; createdAt: TimestampMillis; }
export const buildProfileView = (viewerId: string, viewedId: string): FSProfileView => ({ viewerId, viewedId, createdAt: Date.now() });

// boosts
export interface FSBoost { id?: string; userId: string; startedAt: TimestampMillis; expiresAt: TimestampMillis; type: 'profile'; source?: 'purchase'|'grant'|'reward'; }
export const buildBoost = (userId: string, durationMs: number, source?: FSBoost['source']): FSBoost => { const start=Date.now(); return { userId, startedAt:start, expiresAt:start+durationMs, type:'profile', source }; };

// blocks
export interface FSBlock { id?: string; blockerId: string; blockedId: string; createdAt: TimestampMillis; reason?: string; reviewed?: boolean; }
export const buildBlock = (blockerId: string, blockedId: string, reason?: string): FSBlock => ({ blockerId, blockedId, createdAt: Date.now(), reason });

// quickPicks
export interface FSQuickPick { id?: string; userId: string; candidateUserId: string; createdAt: TimestampMillis; rank: number; algorithm: string; expiresAt?: TimestampMillis; }
export const buildQuickPick = (
  userId: string,
  candidateUserId: string,
  rank: number,
  algorithm: string,
  ttlMs?: number
): FSQuickPick => {
  const now = Date.now();
  const base: FSQuickPick = {
    userId,
    candidateUserId,
    createdAt: now,
    rank,
    algorithm,
  };
  if (ttlMs && ttlMs > 0) {
    (base as any).expiresAt = now + ttlMs;
  }
  return base;
};

// engagementNotes
export interface FSEngagementNote { id?: string; userId: string; actorUserId: string; note: string; createdAt: TimestampMillis; category?: string; }
export const buildEngagementNote = (userId: string, actorUserId: string, note: string, category?: string): FSEngagementNote => ({ userId, actorUserId, note, category, createdAt: Date.now() });

// usageTracking raw events
export interface FSUsageEvent { id?: string; userId: string; feature: string; timestamp: TimestampMillis; month: string; metadata?: Record<string, unknown>; }
export const buildUsageEvent = (userId: string, feature: string, metadata?: Record<string, unknown>): FSUsageEvent => { const ts=Date.now(); const month=new Date(ts).toISOString().slice(0,7); return { userId, feature, timestamp: ts, month, metadata }; };

// usageMonthly aggregate
export interface FSUsageMonthly { id?: string; userId: string; feature: string; month: string; count: number; updatedAt: TimestampMillis; limit?: number; }
export const buildUsageMonthly = (userId: string, feature: string, month: string, initial=0): FSUsageMonthly => ({ userId, feature, month, count: initial, updatedAt: Date.now() });

// recommendations items (subcollection)
export interface FSRecommendationItem { id?: string; userId: string; candidateUserId: string; score: number; reasons?: string[]; createdAt: TimestampMillis; expiresAt?: TimestampMillis; algorithm: string; }
export const buildRecommendationItem = (
  userId: string,
  candidateUserId: string,
  score: number,
  algorithm: string,
  reasons?: string[],
  ttlMs?: number
): FSRecommendationItem => {
  const now = Date.now();
  const base: FSRecommendationItem = {
    userId,
    candidateUserId,
    score,
    algorithm,
    reasons,
    createdAt: now,
  } as FSRecommendationItem;
  if (ttlMs && ttlMs > 0) {
    (base as any).expiresAt = now + ttlMs;
  }
  return base;
};

// subscriptions
export interface FSSubscription { id?: string; userId: string; plan: string; status: 'active'|'past_due'|'canceled'|'incomplete'|'trialing'|'expired'; startedAt: TimestampMillis; currentPeriodEnd: TimestampMillis; cancelAtPeriodEnd?: boolean; updatedAt: TimestampMillis; provider?: string; providerSubscriptionId?: string; trialEndsAt?: TimestampMillis; meta?: Record<string, unknown>; }
export const buildSubscription = (p: Omit<FSSubscription,'startedAt'|'updatedAt'>): FSSubscription => { const now=Date.now(); return { ...p, startedAt: now, updatedAt: now }; };

// messageReceipts
export interface FSMessageReceipt { id?: string; messageId: string; conversationId: string; userId: string; status: 'delivered'|'read'|'failed'; updatedAt: TimestampMillis; deliveredAt?: TimestampMillis; readAt?: TimestampMillis; failureReason?: string; }
export const buildMessageReceipt = (messageId: string, conversationId: string, userId: string, status: FSMessageReceipt['status']): FSMessageReceipt => ({ messageId, conversationId, userId, status, updatedAt: Date.now() });

// auditLogs
export interface FSAuditLog { id?: string; actorUserId: string; action: string; targetType: string; targetId?: string; meta?: Record<string, unknown>; createdAt: TimestampMillis; ip?: string; }
export const buildAuditLog = (p: Omit<FSAuditLog,'createdAt'>): FSAuditLog => ({ ...p, createdAt: Date.now() });

// blogPosts
export interface FSBlogPost { id?: string; slug: string; title: string; authorUserId: string; content: string; tags?: string[]; published: boolean; createdAt: TimestampMillis; updatedAt: TimestampMillis; publishedAt?: TimestampMillis; summary?: string; heroImageUrl?: string; }
export const buildBlogPost = (p: Omit<FSBlogPost,'createdAt'|'updatedAt'>): FSBlogPost => { const now=Date.now(); return { ...p, createdAt: now, updatedAt: now }; };

// profileDrafts
export interface FSProfileDraft { id?: string; userId: string; data: Record<string, unknown>; updatedAt: TimestampMillis; createdAt: TimestampMillis; step?: string; }
export const buildProfileDraft = (userId: string, data: Record<string, unknown>, step?: string): FSProfileDraft => { const now=Date.now(); return { userId, data, step, createdAt: now, updatedAt: now }; };

// safetyReports
export interface FSSafetyReport { id?: string; reporterUserId: string; reportedUserId: string; reason: string; description?: string; createdAt: TimestampMillis; status: 'open'|'reviewing'|'action_taken'|'dismissed'; resolvedAt?: TimestampMillis; resolutionNote?: string; moderatorUserId?: string; }
export const buildSafetyReport = (p: Omit<FSSafetyReport,'createdAt'|'status'> & { status?: FSSafetyReport['status'] }): FSSafetyReport => ({ ...p, status: p.status || 'open', createdAt: Date.now() });

// Collection name constants
export const COL_INTERESTS = 'interests';
export const COL_PROFILE_VIEWS = 'profileViews';
export const COL_BOOSTS = 'boosts';
export const COL_BLOCKS = 'blocks';
export const COL_QUICK_PICKS = 'quickPicks';
export const COL_ENGAGEMENT_NOTES = 'engagementNotes';
export const COL_USAGE_EVENTS = 'usageTracking';
export const COL_USAGE_MONTHLY = 'usageMonthly';
export const COL_RECOMMENDATIONS = 'recommendations';
export const COL_SUBSCRIPTIONS = 'subscriptions';
export const COL_MESSAGE_RECEIPTS = 'messageReceipts';
export const COL_AUDIT_LOGS = 'auditLogs';
export const COL_BLOG_POSTS = 'blogPosts';
export const COL_PROFILE_DRAFTS = 'profileDrafts';
export const COL_SAFETY_REPORTS = 'safetyReports';
export const COL_NOTES = 'notes';
export const COL_SHORTLISTS = 'shortlists';
export const COL_IMAGES = 'images';
export const COL_TYPING_INDICATORS = 'typingIndicators';
export const COL_VOICE_MESSAGES = 'voiceMessages';

// Helper id builders
export function monthKey(ts: number = Date.now()): string { return new Date(ts).toISOString().slice(0,7); }
export function usageMonthlyId(userId: string, feature: string, month: string = monthKey()): string { return `${userId}_${month}_${feature}`; }
export function interestId(fromUserId: string, toUserId: string): string { return `${fromUserId}_${toUserId}`; }
export function blockId(blockerId: string, blockedId: string): string { return `${blockerId}_${blockedId}`; }
export function messageReceiptId(messageId: string, userId: string): string { return `${messageId}_${userId}`; }

// typing indicators (ephemeral - prune by updatedAt threshold in queries)
export interface FSTypingIndicator { id?: string; conversationId: string; userId: string; isTyping: boolean; updatedAt: TimestampMillis; }
export const buildTypingIndicator = (conversationId: string, userId: string, isTyping: boolean): FSTypingIndicator => ({ conversationId, userId, isTyping, updatedAt: Date.now() });

// shortlists
export interface FSShortlist { id?: string; fromUserId: string; toUserId: string; createdAt: TimestampMillis; }
export const buildShortlist = (fromUserId: string, toUserId: string): FSShortlist => ({ fromUserId, toUserId, createdAt: Date.now() });

// images (profile)
export interface FSImageMeta { id?: string; userId: string; storageId: string; fileName: string; contentType?: string; fileSize?: number; createdAt: TimestampMillis; }
export const buildImageMeta = (p: Omit<FSImageMeta,'createdAt'|'id'>): FSImageMeta => ({ ...p, createdAt: Date.now() });

// matches (added to support mutual interest match creation during migration)
export interface FSMatch { id?: string; user1Id: string; user2Id: string; status: 'matched'; createdAt: TimestampMillis; conversationId: string; lastMessageText?: string; lastMessageAt?: TimestampMillis; }
export function deterministicMatchId(userA: string, userB: string): string {
  const sorted = [userA, userB].sort();
  return `${sorted[0]}__${sorted[1]}`; // double underscore to avoid accidental collisions
}
export const buildMatch = (userA: string, userB: string): FSMatch => {
  const createdAt = Date.now();
  const sorted = [userA, userB].sort();
  return {
    user1Id: sorted[0],
    user2Id: sorted[1],
    status: "matched",
    createdAt,
    conversationId: `${sorted[0]}_${sorted[1]}`,
  };
};
export const COL_MATCHES = 'matches';

// notes (private engagement notes)
export interface FSNote { id?: string; userId: string; toUserId: string; note: string; updatedAt: TimestampMillis; createdAt: TimestampMillis; }
export const buildNote = (userId: string, toUserId: string, note: string): FSNote => { const now = Date.now(); return { userId, toUserId, note, updatedAt: now, createdAt: now }; };

// voice messages
export interface FSVoiceMessage { id?: string; conversationId: string; fromUserId: string; toUserId: string; storagePath: string; duration: number; fileSize: number; mimeType: string; createdAt: TimestampMillis; peaks?: number[]; }
export const buildVoiceMessage = (p: Omit<FSVoiceMessage,'id'|'createdAt'>): FSVoiceMessage => ({ ...p, createdAt: Date.now() });
