"use client";

import { useState, useEffect } from "react";

/**
 * Hook that tracks document visibility state.
 * Returns true when the tab is visible, false when hidden.
 * Useful for pausing background operations like polling when the user isn't looking.
 */
export function useVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(
    typeof document !== "undefined" ? document.visibilityState === "visible" : true
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
