import { useEffect, useState, useCallback } from "react";

export type ConnectionQuality = "excellent" | "good" | "slow" | "poor" | "offline";

export interface NetworkStatus {
  isOnline: boolean;
  quality: ConnectionQuality;
  isSlowConnection: boolean;
  latency?: number;
  lastOnline: number | null;
}

const CONNECTION_QUALITY_THRESHOLDS = {
  excellent: 50, // ms
  good: 200, // ms
  slow: 1000, // ms
  poor: 3000, // ms
} as const;

export function useOffline(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => {
    const isOnline = typeof window !== "undefined" && typeof navigator !== "undefined"
      ? navigator.onLine
      : true;

    return {
      isOnline,
      quality: "good",
      isSlowConnection: false,
      lastOnline: isOnline ? Date.now() : null,
    };
  });

  const measureLatency = useCallback(async (): Promise<number> => {
    if (typeof window === "undefined" || !navigator.onLine) {
      return Infinity;
    }

    const start = Date.now();
    try {
      // Use a small image or endpoint for latency testing
      const response = await fetch('/favicon.ico?' + Date.now(), {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return Date.now() - start;
    } catch {
      return Infinity;
    }
  }, []);

  const updateNetworkStatus = useCallback(async () => {
    const isOnline = typeof window !== "undefined" && typeof navigator !== "undefined"
      ? navigator.onLine
      : true;

    let quality: ConnectionQuality = "good";
    let latency: number | undefined;
    let isSlowConnection = false;

    if (isOnline) {
      try {
        latency = await measureLatency();

        if (latency === Infinity) {
          quality = "offline";
        } else if (latency >= CONNECTION_QUALITY_THRESHOLDS.poor) {
          quality = "poor";
          isSlowConnection = true;
        } else if (latency >= CONNECTION_QUALITY_THRESHOLDS.slow) {
          quality = "slow";
          isSlowConnection = true;
        } else if (latency >= CONNECTION_QUALITY_THRESHOLDS.good) {
          quality = "good";
        } else {
          quality = "excellent";
        }
      } catch {
        quality = "poor";
        isSlowConnection = true;
        latency = undefined;
      }
    } else {
      quality = "offline";
    }

    setNetworkStatus(prev => ({
      isOnline,
      quality,
      isSlowConnection,
      latency,
      lastOnline: isOnline ? Date.now() : prev.lastOnline,
    }));
  }, [measureLatency]);

  useEffect(() => {
    // Initial status check
    updateNetworkStatus();

    // Set up event listeners
    const handleOnline = () => {
      setNetworkStatus(prev => ({ ...prev, lastOnline: Date.now() }));
      updateNetworkStatus();
    };

    const handleOffline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false,
        quality: "offline",
        isSlowConnection: true,
      }));
    };

    // Listen for browser online/offline events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic network quality checks
    const interval = setInterval(updateNetworkStatus, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [updateNetworkStatus]);

  // Also listen for visibility change to recheck when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateNetworkStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [updateNetworkStatus]);

  return networkStatus;
}
