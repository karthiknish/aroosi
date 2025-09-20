import { Button } from "@/components/ui/button";
import { AlertTriangle, WifiOff, RefreshCw, Clock } from "lucide-react";
import * as React from "react";
import { useOffline, NetworkStatus } from "@/hooks/useOffline";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
  showRetryButton?: boolean;
  variant?: "default" | "compact" | "minimal";
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = "Something went wrong.",
  onRetry,
  className = "",
  showRetryButton = true,
  variant = "default",
}) => {
  const networkStatus = useOffline();

  const getIcon = () => {
    if (!networkStatus.isOnline) {
      return <WifiOff className="h-8 w-8 text-red-500" />;
    }
    if (networkStatus.isSlowConnection) {
      return <Clock className="h-8 w-8 text-yellow-500" />;
    }
    return <AlertTriangle className="h-8 w-8 text-orange-500" />;
  };

  const getDisplayMessage = () => {
    if (!networkStatus.isOnline) {
      return "You're offline. Please check your internet connection and try again.";
    }
    if (networkStatus.isSlowConnection) {
      return networkStatus.quality === "slow"
        ? "Connection is slow. This might take longer than usual."
        : "Poor connection detected. Please check your network.";
    }
    return message;
  };

  const getVariantClasses = () => {
    switch (variant) {
      case "compact":
        return "py-4 gap-2";
      case "minimal":
        return "py-2 gap-1";
      case "default":
      default:
        return "py-8 gap-4";
    }
  };

  const shouldShowRetry = showRetryButton && onRetry;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${getVariantClasses()} ${className}`}
    >
      {getIcon()}
      <p className={`text-gray-700 max-w-xs ${
        variant === "minimal" ? "text-xs" : "text-sm"
      }`}>
        {getDisplayMessage()}
      </p>

      {networkStatus.latency && networkStatus.latency < Infinity && (
        <p className="text-xs text-gray-500">
          Connection latency: {networkStatus.latency}ms
        </p>
      )}

      {shouldShowRetry && (
        <Button
          variant="outline"
          size={variant === "minimal" ? "sm" : "sm"}
          onClick={onRetry}
          className="mt-2"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {networkStatus.isOnline ? "Retry" : "Retry When Online"}
        </Button>
      )}
    </div>
  );
};

// Network-specific error state component
export const NetworkErrorState: React.FC<{
  onRetry?: () => void;
  className?: string;
  showQuality?: boolean;
}> = ({ onRetry, className = "", showQuality = false }) => {
  const networkStatus = useOffline();

  return (
    <div className={`flex flex-col items-center justify-center text-center gap-4 py-8 ${className}`}>
      <div className="flex items-center gap-2">
        {getIcon()}
        {showQuality && networkStatus.quality !== "offline" && (
          <span className="text-xs bg-gray-100 px-2 py-1 rounded-full capitalize">
            {networkStatus.quality}
          </span>
        )}
      </div>

      <div className="text-center">
        <h3 className="font-medium text-gray-900 mb-1">Connection Issue</h3>
        <p className="text-sm text-gray-600 max-w-xs">
          {getDisplayMessage()}
        </p>
        {networkStatus.latency && networkStatus.latency < Infinity && (
          <p className="text-xs text-gray-500 mt-2">
            Current latency: {networkStatus.latency}ms
          </p>
        )}
      </div>

      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
};

function getIcon() {
  return <WifiOff className="h-8 w-8 text-red-500" />;
}

function getDisplayMessage() {
  const networkStatus = useOffline();
  if (!networkStatus.isOnline) {
    return "You're offline. Please check your internet connection.";
  }
  if (networkStatus.isSlowConnection) {
    return "Connection is slow. Some features may be delayed.";
  }
  return "Network error occurred. Please try again.";
}
