// Skeleton component from shadcn/ui
import React from "react";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-md bg-gray-100 dark:bg-gray-600 ${className}`}
  />
);

export default Skeleton;
