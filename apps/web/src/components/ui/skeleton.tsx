// Skeleton component from shadcn/ui
import React from "react";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-md bg-neutral/5 dark:bg-neutral/20 ${className}`}
  />
);

export default Skeleton;
