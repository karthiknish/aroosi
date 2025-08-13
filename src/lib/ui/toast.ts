 
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
      background: "linear-gradient(135deg, #B45E5E 0%, #BE185D 100%)",
      color: "#ffffff",
      border: "1px solid #F9A8D4",
      borderRadius: "0.75rem",
      fontSize: "14px",
      fontWeight: "500",
      padding: "16px 20px",
      boxShadow: "0 6px 16px rgba(190, 24, 93, 0.25)",
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
