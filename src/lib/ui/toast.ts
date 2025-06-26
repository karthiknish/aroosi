 
import { toast } from "sonner";

/**
 * Show an error toast with a generic message in production.
 * In development, if a detailed error is provided, it will be shown to help debugging.
 */
export function showErrorToast(
  error: unknown,
  fallback = "Something went wrong. Please try again."
) {
  const isDev = process.env.NODE_ENV === "development";
  let message = fallback;
  if (isDev) {
    if (typeof error === "string") {
      message = error;
    } else if (error instanceof Error && error.message) {
      message = error.message;
    }
  }
  toast.error(message, {

    style: {
      background: "#B45E5E", // brand danger color
      color: "#ffffff",
      border: "1px solid #BE185D",
      borderRadius: "0.5rem",
      fontSize: "14px",
      fontWeight: "500",
      padding: "12px 16px",
      boxShadow: "0 4px 12px rgba(180, 94, 94, 0.15)",
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
      background: "#7BA17D", // brand success color
      color: "#ffffff",
      border: "1px solid #059669",
      borderRadius: "0.5rem",
      fontSize: "14px",
      fontWeight: "500",
      padding: "12px 16px",
      boxShadow: "0 4px 12px rgba(123, 161, 125, 0.15)",
    },
    duration: 4000,
  });
}

// Informational toast (e.g., prompts or neutral messages)
export function showInfoToast(message: string) {
  toast.info(message, {

    style: {
      background: "#5F92AC", // brand secondary color
      color: "#ffffff",
      border: "1px solid #3E647A",
      borderRadius: "0.5rem",
      fontSize: "14px",
      fontWeight: "500",
      padding: "12px 16px",
      boxShadow: "0 4px 12px rgba(95, 146, 172, 0.15)",
    },
    duration: 4000,
  });
}

// Warning toast for important notifications
export function showWarningToast(message: string) {
  toast.warning(message, {

    style: {
      background: "#D6B27C", // brand accent color
      color: "#ffffff",
      border: "1px solid #B28E5F",
      borderRadius: "0.5rem",
      fontSize: "14px",
      fontWeight: "500",
      padding: "12px 16px",
      boxShadow: "0 4px 12px rgba(214, 178, 124, 0.15)",
    },
    duration: 5000,
  });
}

// Primary branded toast for special announcements
export function showPrimaryToast(message: string) {
  toast(message, {

    style: {
      background: "linear-gradient(135deg, #EC4899 0%, #BE185D 100%)", // brand primary gradient
      color: "#ffffff",
      border: "1px solid #F9A8D4",
      borderRadius: "0.5rem",
      fontSize: "14px",
      fontWeight: "600",
      padding: "12px 16px",
      boxShadow: "0 4px 12px rgba(236, 72, 153, 0.25)",
    },
    duration: 6000,
  });
}
