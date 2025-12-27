"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Wifi, WifiOff, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOffline, ConnectionQuality } from "@/hooks/useOffline";

interface OfflineBannerProps {
  className?: string;
  showRetryButton?: boolean;
  onRetry?: () => void;
  dismissible?: boolean;
  variant?: "banner" | "toast" | "compact";
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  className = "",
  showRetryButton = true,
  onRetry,
  dismissible = false,
  variant = "banner",
}) => {
  const networkStatus = useOffline();
  const [isDismissed, setIsDismissed] = React.useState(false);

  const shouldShow = React.useMemo(() => {
    return !networkStatus.isOnline || networkStatus.isSlowConnection;
  }, [networkStatus.isOnline, networkStatus.isSlowConnection]);

  if (isDismissed && dismissible && !shouldShow) {
    return null;
  }

  const getQualityIcon = () => {
    switch (networkStatus.quality) {
      case "excellent":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "good":
        return <Wifi className="h-4 w-4 text-info" />;
      case "slow":
        return <Wifi className="h-4 w-4 text-warning" />;
      case "poor":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "offline":
      default:
        return <WifiOff className="h-4 w-4 text-danger" />;
    }
  };

  const getQualityMessage = () => {
    switch (networkStatus.quality) {
      case "excellent":
        return "Connection restored! You're back online.";
      case "good":
        return "You're online with good connection.";
      case "slow":
        return "Slow connection detected. Some features may be delayed.";
      case "poor":
        return "Poor connection. Please check your network.";
      case "offline":
      default:
        return "You're offline. Please check your internet connection.";
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case "toast":
        return "fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg border";
      case "compact":
        return "p-2 text-sm";
      case "banner":
      default:
        return "w-full relative z-50";
    }
  };

  const getBackgroundColor = () => {
    if (!networkStatus.isOnline) {
      return "bg-danger/5 border-danger/20";
    }
    if (networkStatus.isSlowConnection) {
      return "bg-warning/5 border-warning/20";
    }
    return "bg-success/5 border-success/20";
  };

  const getTextColor = () => {
    if (!networkStatus.isOnline) {
      return "text-danger";
    }
    if (networkStatus.isSlowConnection) {
      return "text-warning";
    }
    return "text-success";
  };

  if (!shouldShow) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // Default retry behavior - refresh the page or reload data
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: variant === "toast" ? -100 : 0, height: variant === "banner" ? 0 : "auto" }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: variant === "toast" ? -100 : 0, height: variant === "banner" ? 0 : "auto" }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`
          ${getVariantClasses()}
          ${getBackgroundColor()}
          border
          ${getTextColor()}
          ${className}
        `}
      >
        <div className={`
          flex items-center gap-3 px-4 py-3
          ${variant === "toast" ? "px-4 py-3" : ""}
          ${variant === "compact" ? "px-3 py-2" : ""}
        `}>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getQualityIcon()}
            {networkStatus.isOnline && (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className={`
              text-sm font-medium
              ${variant === "compact" ? "text-xs" : ""}
            `}>
              {getQualityMessage()}
            </p>

            {networkStatus.latency && networkStatus.latency < Infinity && (
              <p className="text-xs text-neutral-light mt-1">
                Latency: {networkStatus.latency}ms
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {showRetryButton && (
              <Button
                variant="outline"
                size={variant === "compact" ? "sm" : "sm"}
                onClick={handleRetry}
                className={`
                  border-current text-current hover:bg-current hover:text-white
                  ${variant === "compact" ? "px-2 py-1 h-6 text-xs" : ""}
                `}
              >
                <RefreshCw className={`
                  h-3 w-3 mr-1
                  ${variant === "compact" ? "h-2.5 w-2.5" : ""}
                `} />
                Retry
              </Button>
            )}

            {dismissible && (
              <Button
                variant="ghost"
                size={variant === "compact" ? "sm" : "sm"}
                onClick={handleDismiss}
                className={`
                  text-current hover:bg-current hover:text-white p-1
                  ${variant === "compact" ? "h-6 w-6 p-0" : ""}
                `}
              >
                ×
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Compact indicator for headers/tooltips
export const ConnectionIndicator: React.FC<{
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}> = ({
  showLabel = false,
  size = "md",
  className = ""
}) => {
  const networkStatus = useOffline();

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-2 w-2";
      case "lg":
        return "h-4 w-4";
      case "md":
      default:
        return "h-3 w-3";
    }
  };

  const getIcon = () => {
    switch (networkStatus.quality) {
      case "excellent":
        return <CheckCircle className={`${getSizeClasses()} text-success`} />;
      case "good":
        return <Wifi className={`${getSizeClasses()} text-info`} />;
      case "slow":
        return <Wifi className={`${getSizeClasses()} text-warning`} />;
      case "poor":
        return <AlertTriangle className={`${getSizeClasses()} text-warning`} />;
      case "offline":
      default:
        return <WifiOff className={`${getSizeClasses()} text-danger`} />;
    }
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {getIcon()}
      {showLabel && (
        <span className="text-xs text-neutral-light capitalize">
          {networkStatus.quality}
        </span>
      )}
    </div>
  );
};
