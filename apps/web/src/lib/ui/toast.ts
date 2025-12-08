 
import { toast } from "sonner";

// Keep track of recent toast messages to prevent duplicates
const recentToasts = new Map<string, number>();

/**
 * Show an error toast with a generic message in production.
 * In development, if a detailed error is provided, it will be shown to help debugging.
 * This function prevents duplicate toasts within a 3-second window.
 */
export function showErrorToast(
  error: unknown,
  fallback = "Something went wrong. Please try again."
) {
  // Prefer a specific message when provided (string, Error, or ApiFailure shape)
  let message: string | undefined;
  if (typeof error === "string" && error.trim()) {
    message = error.trim();
  } else if (
    error &&
    typeof error === "object" &&
    "error" in (error as Record<string, unknown>) &&
    typeof (error as any).error === "string" &&
    (error as any).error.trim()
  ) {
    message = ((error as any).error as string).trim();
  } else if (error instanceof Error && error.message) {
    message = error.message.trim();
  }

  // Fallback when no specific message available
  if (!message || message.length === 0) message = fallback;

  // Attempt to detect structured server payloads appended to error messages (e.g., "... :: {\"code\":\"ONBOARDING_INCOMPLETE\"}")
  try {
    const raw = message.split("::").pop()?.trim();
    if (raw && raw.startsWith("{") && raw.endsWith("}")) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === "object" &&
        parsed.code === "ONBOARDING_INCOMPLETE"
      ) {
        message = "Please finish onboarding to continue.";
      }
    }
  } catch {
    // ignore parse issues
  }

  // If the user hasn't finished onboarding (tracked in localStorage) and we see generic permission wording, prefer onboarding guidance
  try {
    if (typeof window !== "undefined") {
      const onboardingState = window.localStorage.getItem("onboarding");
      if (
        onboardingState === "incomplete" &&
        /permission|insufficient permissions|forbidden/i.test(message)
      ) {
        message = "Please finish onboarding to continue.";
      }
    }
  } catch {
    // ignore storage issues
  }

  // Humanize Firebase / technical auth errors to be user-friendly
  function humanize(msg: string): string {
    const original = msg;
    // Strip standard Firebase wrapper prefix e.g. "Firebase: Error (auth/invalid-email)."
    msg = msg.replace(/^Firebase:?( Error)? ?\(([^)]+)\)\.?/i, "$2");
    // Replace remaining explicit brand mentions (avoid exposing backend vendor)
    msg = msg.replace(/firebase/gi, "service");
    // Common auth code mappings
    const mappings: { pattern: RegExp; friendly: string }[] = [
      {
        pattern: /auth\/(email-already-in-use|email-already-exists)/i,
        friendly: "An account with this email already exists.",
      },
      { pattern: /auth\/invalid-email/i, friendly: "Invalid email address." },
      {
        pattern: /auth\/(invalid-password|weak-password)/i,
        friendly: "Password is too weak.",
      },
      {
        pattern: /auth\/wrong-password/i,
        friendly: "Incorrect email or password.",
      },
      {
        pattern: /auth\/(user-not-found|user-disabled)/i,
        friendly: "Account not found.",
      },
      {
        pattern: /auth\/too-many-requests/i,
        friendly: "Too many attempts. Please try again later.",
      },
      {
        pattern: /auth\/network-request-failed/i,
        friendly: "Network error. Check your connection.",
      },
      {
        pattern: /auth\/popup-closed-by-user/i,
        friendly: "Sign-in was cancelled.",
      },
      {
        pattern: /auth\/internal-error/i,
        friendly: "Unexpected error. Please try again.",
      },
      {
        pattern: /auth\/id-token-expired/i,
        friendly: "Session expired. Please sign in again.",
      },
      {
        pattern: /auth\/invalid-credential/i,
        friendly: "Invalid email or password.",
      },
      {
        pattern: /permission-denied/i,
        friendly: "You don't have permission to do that.",
      },
      {
        pattern: /missing or insufficient permissions/i,
        friendly: "You don't have permission to do that.",
      },
    ];
    for (const { pattern, friendly } of mappings) {
      if (pattern.test(msg)) return friendly;
    }
    // If entire message still looks like an auth code (e.g. auth/xyz) simplify
    if (/^auth\//i.test(msg)) return fallback;
    // If nothing changed but original was very technical, fall back
    if (original === msg && /auth\//i.test(original)) return fallback;
    return msg;
  }
  try {
    message = humanize(message);
  } catch {
    // swallow humanize errors
  }

  // Basic sanitation to avoid multi-line/noisy messages
  try {
    message = message.replace(/[\r\n]+/g, " ").slice(0, 300);
  } catch {
    // ignore sanitize issues
  }

  // Prevent duplicate toasts within a 3-second window
  const now = Date.now();
  const lastToastTime = recentToasts.get(message);
  if (lastToastTime && now - lastToastTime < 3000) {
    // Skip showing duplicate toast
    return;
  }

  // Record this toast
  recentToasts.set(message, now);

  // Clean up old entries (older than 5 seconds) to prevent memory leaks
  for (const [msg, time] of recentToasts.entries()) {
    if (now - time > 5000) {
      recentToasts.delete(msg);
    }
  }

  toast.error(message, {
    style: {
      // Force vivid error background (fallback to gradient if CSS vars missing)
      background:
        "var(--toast-error-bg, linear-gradient(135deg, #dc2626 0%, #be123c 100%))",
      color: "var(--toast-error-fg, #ffffff)",
      border: "1px solid var(--toast-error-border, #fecdd3)",
      borderRadius: "0.75rem",
      fontSize: "14px",
      fontWeight: "500",
      padding: "16px 20px",
      boxShadow:
        "0 6px 18px -2px rgba(220,38,38,0.35), 0 2px 4px rgba(220,38,38,0.25)",
      backdropFilter: "blur(4px)",
    },
    duration: 5000,
  });
  // Always log the raw error for diagnostics
  if (error) {
    console.error("[ToastError]", error);
  }
}

export function showSuccessToast(message: string) {
  toast.success(message, {
    style: {
      background: "linear-gradient(135deg, #7BA17D 0%, #059669 100%)",
      color: "#ffffff",
      border: "1px solid #A7F3D0",
      borderRadius: "0.75rem",
      fontSize: "14px",
      fontWeight: "500",
      padding: "16px 20px",
      boxShadow: "0 6px 16px rgba(5, 150, 105, 0.25)",
    },
    duration: 4000,
  });
}

// Success toast with an inline action (e.g. Undo)
export function showUndoToast(
  message: string,
  onUndo: () => void | Promise<void>,
  actionLabel = "Undo",
  duration = 6000
) {
  toast.success(message, {
    style: {
      background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
      color: "#ffffff",
      border: "1px solid #34D399",
      borderRadius: "0.75rem",
      fontSize: "14px",
      fontWeight: "500",
      padding: "16px 20px",
      boxShadow: "0 6px 16px rgba(4, 120, 87, 0.25)",
    },
    duration,
    action: {
      label: actionLabel,
      onClick: () => {
        try {
          const r = onUndo();
          if (r instanceof Promise) r.catch((e) => console.error("Undo failed", e));
        } catch (e) {
          console.error("Undo failed", e);
        }
      },
    },
  });
}

// Informational toast (e.g., prompts or neutral messages)
export function showInfoToast(message: string) {
  toast.info(message, {
    style: {
      background: "linear-gradient(135deg, #5F92AC 0%, #3E647A 100%)",
      color: "#ffffff",
      border: "1px solid #BFDBFE",
      borderRadius: "0.75rem",
      fontSize: "14px",
      fontWeight: "500",
      padding: "16px 20px",
      boxShadow: "0 6px 16px rgba(62, 100, 122, 0.25)",
    },
    duration: 4000,
  });
}

// Warning toast for important notifications
export function showWarningToast(message: string) {
  toast.warning(message, {
    style: {
      background: "linear-gradient(135deg, #D6B27C 0%, #B28E5F 100%)",
      color: "#ffffff",
      border: "1px solid #FDE68A",
      borderRadius: "0.75rem",
      fontSize: "14px",
      fontWeight: "500",
      padding: "16px 20px",
      boxShadow: "0 6px 16px rgba(178, 142, 95, 0.25)",
    },
    duration: 5000,
  });
}

// Primary branded toast for special announcements
export function showPrimaryToast(message: string) {
  toast(message, {
    style: {
      background: "linear-gradient(135deg, #EC4899 0%, #BE185D 100%)",
      color: "#ffffff",
      border: "1px solid #FBCFE8",
      borderRadius: "0.75rem",
      fontSize: "14px",
      fontWeight: "600",
      padding: "16px 20px",
      boxShadow: "0 6px 16px rgba(236, 72, 153, 0.3)",
    },
    duration: 6000,
  });
}
