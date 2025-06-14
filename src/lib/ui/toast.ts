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
      background: "#FDA4AF", // brand pink
      color: "#ffffff",
    },
  });
  // Always log the raw error for diagnostics
  if (error) {
    console.error("[ToastError]", error);
  }
}

export function showSuccessToast(message: string) {
  toast.success(message, {
    style: {
      background: "#BFA67A", // brand gold
      color: "#ffffff",
    },
  });
}

// Informational toast (e.g., prompts or neutral messages)
export function showInfoToast(message: string) {
  toast.info(message, {
    style: {
      background: "#f5f5f5",
      color: "#000000",
    },
  });
}
