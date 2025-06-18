import * as React from "react";
import { Ban } from "lucide-react";

interface EmptyStateProps {
  message?: string;
  description?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message = "No data available.",
  description,
  className = "",
}) => (
  <div
    className={`flex flex-col items-center justify-center text-center gap-4 py-8 ${className}`}
  >
    <Ban className="h-8 w-8 text-muted-foreground" />
    <p className="text-sm text-gray-600 max-w-xs">{message}</p>
    {description && (
      <p className="text-xs text-gray-500 max-w-xs">{description}</p>
    )}
  </div>
);
