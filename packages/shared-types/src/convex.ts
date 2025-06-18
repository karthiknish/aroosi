// Convex-specific types and utilities

export interface ConvexQueryResult<T> {
  data: T;
  error?: string;
}

export interface ConvexMutationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Re-export the generic Id type for convenience
export type { Id } from './profile';