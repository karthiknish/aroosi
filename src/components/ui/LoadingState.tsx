import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingState({ 
  message = "Loading...", 
  size = 'md',
  className 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div 
      data-testid="loading-state"
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        className
      )}
    >
      <div 
        data-testid="loading-spinner"
        className={cn(
          "animate-spin rounded-full border-2 border-gray-300 border-t-primary mb-4",
          sizeClasses[size]
        )}
      />
      <p className="text-gray-600">{message}</p>
    </div>
  );
}