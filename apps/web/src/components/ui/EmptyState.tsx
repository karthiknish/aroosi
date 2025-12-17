import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  message?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  message = "No data available", 
  description, 
  icon, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <div 
      data-testid="empty-state"
      role="status"
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        className
      )}
    >
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-neutral mb-2">{message}</h3>
      {description && (
        <p className="text-neutral-light mb-4 max-w-md">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}