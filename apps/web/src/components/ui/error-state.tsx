import { Button } from "@/components/ui/button";
import { AlertTriangle, WifiOff, RefreshCw, Clock } from "lucide-react";
import * as React from "react";
import { useOffline } from "@/hooks/useOffline";

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
      return <WifiOff className="h-8 w-8 text-danger" />;
    }
    if (networkStatus.isSlowConnection) {
      return <Clock className="h-8 w-8 text-warning" />;
    }
    return <AlertTriangle className="h-8 w-8 text-warning" />;
  };

  const getDisplayMessage = (status: typeof networkStatus) => {
    if (!status.isOnline) {
      return "You're offline. Please check your internet connection and try again.";
    }
    if (status.isSlowConnection) {
      return status.quality === "slow"
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
      <p className={`text-neutral-dark max-w-xs ${
        variant === "minimal" ? "text-xs" : "text-sm"
      }`}>
        {getDisplayMessage(networkStatus)}
      </p>

      {networkStatus.latency && networkStatus.latency < Infinity && (
        <p className="text-xs text-neutral-light">
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

  const getNetworkDisplayMessage = (status: typeof networkStatus) => {
    if (!status.isOnline) {
      return "You're offline. Please check your internet connection.";
    }
    if (status.isSlowConnection) {
      return "Connection is slow. Some features may be delayed.";
    }
    return "Network error occurred. Please try again.";
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center gap-4 py-8 ${className}`}>
      <div className="flex items-center gap-2">
        {getIcon()}
        {showQuality && networkStatus.quality !== "offline" && (
          <span className="text-xs bg-neutral/10 text-neutral-dark px-2 py-1 rounded-full capitalize">
            {networkStatus.quality}
          </span>
        )}
      </div>

      <div className="text-center">
        <h3 className="font-medium text-neutral-dark mb-1">Connection Issue</h3>
        <p className="text-sm text-neutral-light max-w-xs">
          {getNetworkDisplayMessage(networkStatus)}
        </p>
        {networkStatus.latency && networkStatus.latency < Infinity && (
          <p className="text-xs text-neutral-light mt-2">
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
  return <WifiOff className="h-8 w-8 text-danger" />;
}

