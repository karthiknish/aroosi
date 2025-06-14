// Skeleton component from shadcn/ui
import React from "react";


interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-700 ${className}`}
  />
);

export default Skeleton;
