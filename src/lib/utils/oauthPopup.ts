/**
 * Utility functions for handling OAuth popup windows
 */

export interface PopupOptions {
  width?: number;
  height?: number;
  onClose?: () => void;
  onError?: (error: string) => void;
}

/**
 * Opens a popup window for OAuth authentication
 */
export function openOAuthPopup(
  url: string,
  title: string,
  options: PopupOptions = {},
): Window | null {
  const { width = 500, height = 600, onClose, onError } = options;

  // Calculate center position
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  // Open popup
  const popup = window.open(
    url,
    title,
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`,
  );

  // Check if popup was blocked
  if (!popup || popup.closed) {
    onError?.("Please allow popups for this site to sign in with Google");
    return null;
  }

  // Focus the popup
  popup.focus();

  // Poll to check if the popup is closed
  const checkInterval = setInterval(() => {
    if (popup.closed) {
      clearInterval(checkInterval);
      onClose?.();
    }
  }, 500);

  return popup;
}

/**
 * Sets up a message listener for OAuth callbacks
 */
export function setupOAuthMessageListener(
  onSuccess: () => void,
  onError?: (error: string) => void,
): () => void {
  const handleMessage = (event: MessageEvent) => {
    // Verify the message is from our domain
    if (event.origin !== window.location.origin) return;

    // Check message type
    if (event.data?.type === "oauth-success") {
      console.log("OAuth success message received");
      onSuccess();
    } else if (event.data?.type === "oauth-error") {
      console.error("OAuth error:", event.data.error);
      onError?.(event.data.error || "OAuth authentication failed");
    }
  };

  window.addEventListener("message", handleMessage);

  // Return cleanup function
  return () => window.removeEventListener("message", handleMessage);
}
