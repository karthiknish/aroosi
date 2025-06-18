import { Button } from "@/components/ui/button";
import { AlertTriangle, WifiOff } from "lucide-react";
import * as React from "react";
import { useOffline } from "@/hooks/useOffline";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = "Something went wrong.",
  onRetry,
  className = "",
}) => {
  const offline = useOffline();
  const displayMsg = offline ? "You appear to be offline." : message;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-4 py-8 ${className}`}
    >
      {offline ? (
        <WifiOff className="h-8 w-8 text-destructive" />
      ) : (
        <AlertTriangle className="h-8 w-8 text-destructive" />
      )}
      <p className="text-sm text-gray-700 max-w-xs">{displayMsg}</p>
      {onRetry && !offline && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
};
