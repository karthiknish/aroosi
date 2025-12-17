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
    <Ban className="h-8 w-8 text-neutral-light" />
    <p className="text-sm text-neutral-dark max-w-xs">{message}</p>
    {description && (
      <p className="text-xs text-neutral-light max-w-xs">{description}</p>
    )}
  </div>
);
