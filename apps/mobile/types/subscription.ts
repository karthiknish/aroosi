export type SubscriptionTier = 'free' | 'premium' | 'premium_plus';

export type SubscriptionStatus = 
  | 'active' 
  | 'expired' 
  | 'cancelled' 
  | 'pending' 
  | 'grace_period' 
  | 'on_hold';

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: 'monthly' | 'yearly';
  features: string[];
  popularBadge?: boolean;
  
  // Store-specific IDs
  appleProductId?: string;
  googleProductId?: string;
  stripeProductId?: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  trialEnd?: number;
  
  // Payment info
  paymentMethod?: 'apple' | 'google' | 'stripe';
  originalTransactionId?: string;
  latestReceiptData?: string;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

export interface FeatureUsage {
  userId: string;
  tier: SubscriptionTier;
  period: string; // YYYY-MM format
  
  // Usage counters
  messagesSent: number;
  interestsSent: number;
  profileViews: number;
  searchesPerformed: number;
  profileBoosts: number;
  
  // Limits based on tier
  limits: FeatureLimits;
  
  // Timestamps
  lastUpdated: number;
  periodStart: number;
  periodEnd: number;
}

export interface FeatureLimits {
  maxMessages: number | null; // null = unlimited
  maxInterests: number | null;
  maxProfileViews: number | null;
  maxSearches: number | null;
  maxProfileBoosts: number | null;
  
  // Feature access
  canViewWhoLikedMe: boolean;
  canSeeWhoViewedProfile: boolean;
  canUseAdvancedFilters: boolean;
  canBoostProfile: boolean;
  canSendUnlimitedMessages: boolean;
  canSeeReadReceipts: boolean;
  canUseIncognitoMode: boolean;
  canAccessPrioritySupport: boolean;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  cancelled?: boolean;
}

export interface SubscriptionInfo {
  subscription: UserSubscription | null;
  usage: FeatureUsage;
  hasActiveSubscription: boolean;
  isTrialActive: boolean;
  daysUntilExpiry: number;
  canAccessFeature: (feature: keyof FeatureLimits) => boolean;
  getRemainingUsage: (feature: keyof FeatureUsage) => number;
  getUsagePercentage: (feature: keyof FeatureUsage) => number;
}