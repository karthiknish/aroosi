/**
 * Chat utility functions shared across components.
 * This module aggregates scroll, error, retry, voice helpers and moderation handlers.
 * Note: Keep UI (toasts) at component level; utils throw and components decide UX.
 */

// ========== SCROLLING ==========

/**
 * Scroll to bottom of a scroll container.
 * instant = true uses 'auto', false uses 'smooth'
 */
export function scrollToBottomUtil(
  ref: React.RefObject<HTMLElement>,
  instant = true
) {
  const el = ref.current;
  if (!el) return;
  el.scrollTo({
    top: (el as any).scrollHeight ?? 0,
    behavior: instant ? "auto" : "smooth",
  } as ScrollToOptions);
}

/**
 * Handle scroll to detect near-bottom, show FAB, and load older when near top.
 */
export function handleScrollUtil(args: {
  el: HTMLElement;
  loadingOlder: boolean;
  hasMore: boolean;
  messagesCount: number;
  fetchOlder: () => Promise<void> | void;
  setIsNearBottom: (v: boolean) => void;
  setShowScrollToBottom: (v: boolean) => void;
}) {
  const {
    el,
    loadingOlder,
    hasMore,
    messagesCount,
    fetchOlder,
    setIsNearBottom,
    setShowScrollToBottom,
  } = args;

  const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  setIsNearBottom(!!isAtBottom);
  setShowScrollToBottom(!isAtBottom && messagesCount > 0);

  if (!loadingOlder && hasMore && el.scrollTop < 200) {
    const currentScrollHeight = el.scrollHeight;
    Promise.resolve(fetchOlder()).then(() => {
      requestAnimationFrame(() => {
        if (el && el.scrollHeight > currentScrollHeight) {
          const newScrollTop =
            el.scrollHeight - currentScrollHeight + el.scrollTop;
          el.scrollTop = newScrollTop;
        }
      });
    });
  }
}

// ========== TIMESTAMP / TYPING (stubs to preserve imports) ==========

export function shouldShowTimestamp(
  _prev: any,
  _current: any,
  _thresholdMs = 5 * 60 * 1000
): boolean {
  // Implement grouping logic as needed; default to true every message for now
  return true;
}

export function createTypingHandlers() {
  // Placeholder to keep import surface; real impl can be added as needed
  return {};
}

// ========== ERROR / RETRY ==========

export function handleErrorUtil(error: unknown): {
  type:
    | "UNAUTHORIZED"
    | "TOKEN_EXPIRED"
    | "NETWORK_ERROR"
    | "RATE_LIMITED"
    | "UNKNOWN";
  message: string;
} {
  let type:
    | "UNAUTHORIZED"
    | "TOKEN_EXPIRED"
    | "NETWORK_ERROR"
    | "RATE_LIMITED"
    | "UNKNOWN" = "UNKNOWN";
  let message = "An error occurred";
  if (error instanceof Error) {
    message = error.message;
    if (message.includes("Unauthorized") || message.includes("401"))
      type = "UNAUTHORIZED";
    else if (message.includes("Token expired") || message.includes("403"))
      type = "TOKEN_EXPIRED";
    else if (message.toLowerCase().includes("network")) type = "NETWORK_ERROR";
    else if (
      message.toLowerCase().includes("rate limit") ||
      message.includes("429")
    )
      type = "RATE_LIMITED";
  }
  return { type, message };
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  onRetry?: (error: unknown, attempt: number) => void
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      onRetry?.(error, attempt);
      if (attempt === maxRetries) break;
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  throw lastError;
}

// ========== VOICE HELPERS (stubs) ==========

export function formatVoiceDurationShort(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

export function pickVoiceMimeType(preferred?: string): string {
  return preferred || "audio/webm";
}

export function buildVoiceFilename(ext = "webm"): string {
  return `voice_${Date.now()}.${ext}`;
}

// ========== MODERATION HELPERS (moved from ModernChat) ==========

export type ReportReason =
  | "spam"
  | "harassment"
  | "inappropriate_content"
  | "fake_profile"
  | "other";

/** Params for blockUserUtil */
export type BlockUserParams = {
  matchUserId: string;
  setIsBlocked: (blocked: boolean) => void;
  setShowReportModal: (open: boolean) => void;
};

/** Params for reportUserUtil */
export type ReportUserParams = {
  matchUserId: string;
  reason: ReportReason;
  description: string;
  setShowReportModal: (open: boolean) => void;
};

// Lazy import actions to avoid circular deps at module-eval time
async function loadActions() {
  const actions = await import("@/lib/chat/actions");
  return {
    blockUserAction: actions.blockUserAction,
    reportUserAction: actions.reportUserAction,
  };
}

/**
 * Block user helper used by ModernChat and other callers.
 * Throws on failure; caller should handle toast/logging.
 */
export async function blockUserUtil(params: BlockUserParams): Promise<void> {
  const { matchUserId, setIsBlocked, setShowReportModal } = params;
  const { blockUserAction } = await loadActions();
  await blockUserAction(matchUserId);
  setIsBlocked(true);
  setShowReportModal(false);
}

/**
 * Report user helper used by ModernChat and other callers.
 * Throws on failure; caller should handle toast/logging.
 */
export async function reportUserUtil(params: ReportUserParams): Promise<void> {
  const { matchUserId, reason, description, setShowReportModal } = params;
  const { reportUserAction } = await loadActions();
  await reportUserAction(matchUserId, reason, description);
  setShowReportModal(false);
}