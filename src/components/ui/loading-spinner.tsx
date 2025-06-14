import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

interface LoadingSpinnerProps {
  size?: number; // size in pixels, defaults to 32 (w-8 h-8)
  className?: string;
  colorClassName?: string; // tailwind text color class, defaults to text-primary
  label?: string; // optional aria-label text for accessibility
}

/**
 * LoadingSpinner provides a consistent animated spinner across the application.
 * It wraps lucide-react's Loader2 icon with default styling that can be
 * overridden via props. Use this instead of importing Loader2 directly for UX
 * consistency.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 32,
  className,
  colorClassName = "text-primary",
  label = "Loading",
}) => {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn(
        `animate-spin`,
        colorClassName,
        className
        // Provide inline style for size to avoid many width/height classes
        // Size prop can be fractional, so inline style safer.
      )}
      style={{ width: size, height: size }}
    />
  );
};
