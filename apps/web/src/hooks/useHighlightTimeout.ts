"use client";

import { useState, useEffect } from "react";

/**
 * A reusable hook to manage a temporary highlight state that automatically clears after a timeout.
 * @param duration The time in milliseconds to keep the highlight active. Default is 3200ms.
 * @returns [highlightedId, setHighlightedId]
 */
export function useHighlightTimeout(duration = 3200) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightedId) return;
    const to = setTimeout(() => setHighlightedId(null), duration);
    return () => clearTimeout(to);
  }, [highlightedId, duration]);

  return [highlightedId, setHighlightedId] as const;
}
