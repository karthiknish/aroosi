// Simple analytics wrapper to centralize event tracking.
// Supports Google Analytics (gtag), fallback no-op in non-browser or disabled mode.

export type AnalyticsEventParams = Record<string, any>;

interface AnalyticsAPI {
  track: (event: string, params?: AnalyticsEventParams) => void;
  pageview: (path?: string) => void;
  identify: (userId: string, traits?: Record<string, any>) => void;
  setUser: (userId: string | null) => void;
}

const isBrowser = typeof window !== 'undefined';

function gtagTrack(event: string, params: AnalyticsEventParams = {}) {
  if (!isBrowser) return;
  const w = window as any;
  if (typeof w.gtag === 'function') {
    w.gtag('event', event, params);
  }
}

function gtagPageview(path?: string) {
  if (!isBrowser) return;
  const w = window as any;
  if (typeof w.gtag === 'function') {
    w.gtag('event', 'page_view', path ? { page_path: path } : undefined);
  }
}

let currentUserId: string | null = null;

function identify(userId: string, traits: Record<string, any> = {}) {
  currentUserId = userId;
  // For GA4 we can set user properties and id
  if (isBrowser) {
    const w = window as any;
    if (typeof w.gtag === 'function') {
      w.gtag('set', { user_id: userId, ...Object.fromEntries(Object.entries(traits).map(([k,v]) => [ `user_${k}` , v])) });
    }
  }
}

function setUser(userId: string | null) {
  currentUserId = userId;
  if (isBrowser && typeof (window as any).gtag === 'function') {
    (window as any).gtag('set', { user_id: userId || undefined });
  }
}

export const analytics: AnalyticsAPI = {
  track: gtagTrack,
  pageview: gtagPageview,
  identify,
  setUser,
};

// Convenience helpers for common events
export function trackSubscriptionPurchase(plan: string, priceId?: string) {
  analytics.track('subscription_purchase', { plan, price_id: priceId });
}

export function trackBoostActivated(remaining: number | string) {
  analytics.track('profile_boost_activated', { remaining });
}

export function trackSpotlightActivated(expiresAt: number) {
  analytics.track('spotlight_activated', { expires_at: expiresAt });
}
